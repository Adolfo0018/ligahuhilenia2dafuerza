import { deleteField, doc, onSnapshot, runTransaction, serverTimestamp } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { ErrorValidacion } from '../admin/useGuardado'
import type { Anuncio, Cobro, Torneo } from '../types'
import { db } from './firebase'
import { aTorneo } from './repositorio'

/**
 * Publicidad por jornada.
 * - Lo público (negocio, logo, mensaje, enlace, vigencia, estado) va en `torneos/{id}.anuncios`, que el sitio ya lee:
 *   cero lecturas extra por visita.
 * - El importe y el estado de pago van en `cobros/{torneoId}`, que solo el administrador puede leer y escribir.
 * - Los logos son archivos estáticos en src/assets/publicidad (agregar uno requiere desplegar).
 */

const ARCHIVOS = import.meta.glob<string>('../assets/publicidad/*.{webp,png,jpg,jpeg,svg}', {
  eager: true,
  query: '?url',
  import: 'default',
})

/** Logos disponibles: nombre del archivo sin extensión → URL publicada. */
export const LOGOS = new Map(
  Object.entries(ARCHIVOS)
    .map(([ruta, url]) => [ruta.split('/').pop()!.replace(/\.[^.]+$/, ''), url] as const)
    .sort(([a], [b]) => a.localeCompare(b)),
)

/** Fecha local de hoy como "2026-11-14". */
export const hoyLocal = () => new Date().toLocaleDateString('sv-SE')

export type Vigencia = 'vigente' | 'programado' | 'vencido'

export function vigencia(a: Pick<Anuncio, 'inicio' | 'fin'>, hoy = hoyLocal()): Vigencia {
  if (hoy < a.inicio) return 'programado'
  if (hoy > a.fin) return 'vencido'
  return 'vigente'
}

const porOrden = (a: Anuncio, b: Anuncio) => a.orden - b.orden || a.negocio.localeCompare(b.negocio)

/** Lo que ve el público en una jornada: solo lo publicado y vigente hoy. */
export function publicidadDeJornada(t: Torneo, jornada: number, hoy = hoyLocal()) {
  const visibles = (t.anuncios ?? []).filter((a) => a.jornada === jornada && a.estado === 'publicado' && vigencia(a, hoy) === 'vigente')
  return {
    oficial: visibles.find((a) => a.tipo === 'oficial'),
    regulares: visibles.filter((a) => a.tipo === 'regular').sort(porOrden),
  }
}

/** Todos los de una jornada, para el panel (los retirados al final). */
export function anunciosDeJornada(t: Torneo, jornada: number) {
  const lista = (t.anuncios ?? []).filter((a) => a.jornada === jornada)
  return {
    oficial: lista.find((a) => a.tipo === 'oficial' && a.estado !== 'retirado'),
    regulares: lista.filter((a) => a.tipo === 'regular').sort(porOrden),
    oficialesRetirados: lista.filter((a) => a.tipo === 'oficial' && a.estado === 'retirado'),
  }
}

/** Convierte lo capturado en un enlace seguro; un número de 10 dígitos se vuelve WhatsApp. Nada más se acepta. */
export function enlaceSeguro(enlace?: string): string | undefined {
  const e = enlace?.trim()
  if (!e) return undefined
  const digitos = e.replace(/[\s()-]/g, '')
  if (/^\+?\d{10,13}$/.test(digitos)) {
    const n = digitos.replace(/^\+/, '')
    return `https://wa.me/${n.length === 10 ? `52${n}` : n}`
  }
  if (/^(https?:\/\/|tel:|mailto:)/i.test(e)) return e
  if (/^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(e)) return `https://${e}`
  return undefined
}

// ---------- Escritura (solo administrador) ----------

function base() {
  if (!db) throw new Error('Firebase no está configurado (src/lib/firebase.ts)')
  return db
}

/**
 * Cambia la lista de anuncios del torneo en una transacción. La transacción lee la versión más reciente del torneo:
 * si otro administrador asignó el patrocinador oficial de la misma jornada, Firestore la repite y la validación lo rechaza.
 */
async function transaccion(torneoId: string, cambio: (anuncios: Anuncio[]) => Anuncio[], cobros?: Record<string, Cobro | null>) {
  await runTransaction(base(), async (tx) => {
    const ref = doc(base(), 'torneos', torneoId)
    const actual = await tx.get(ref)
    if (!actual.exists()) throw new Error('El torneo ya no existe')
    const anuncios = cambio(aTorneo(torneoId, actual.data()).anuncios ?? [])
    validarOficiales(anuncios)
    tx.update(ref, { anuncios, actualizadoEn: serverTimestamp() })
    if (cobros && Object.keys(cobros).length) {
      tx.set(
        doc(base(), 'cobros', torneoId),
        {
          porAnuncio: Object.fromEntries(Object.entries(cobros).map(([id, c]) => [id, c ?? deleteField()])),
          actualizadoEn: serverTimestamp(),
        },
        { merge: true },
      )
    }
  })
}

/** Un solo patrocinador oficial (no retirado) por jornada. */
export function validarOficiales(anuncios: Anuncio[]) {
  const vistos = new Map<number, Anuncio>()
  for (const a of anuncios) {
    if (a.tipo !== 'oficial' || a.estado === 'retirado') continue
    const otro = vistos.get(a.jornada)
    if (otro) throw new ErrorValidacion(`La jornada ${a.jornada} ya tiene patrocinador oficial: ${otro.negocio}. Retíralo o cámbialo a regular.`)
    vistos.set(a.jornada, a)
  }
}

/** Crea o reemplaza un anuncio y su cobro. El orden de un regular nuevo es el último de su jornada. */
export function guardarAnuncio(torneoId: string, anuncio: Anuncio, cobro: Cobro) {
  return transaccion(
    torneoId,
    (lista) => {
      const existe = lista.some((a) => a.id === anuncio.id)
      if (existe) return lista.map((a) => (a.id === anuncio.id ? limpiar(anuncio) : a))
      const orden = Math.max(0, ...lista.filter((a) => a.jornada === anuncio.jornada && a.tipo === anuncio.tipo).map((a) => a.orden)) + 1
      return [...lista, limpiar({ ...anuncio, orden })]
    },
    { [anuncio.id]: cobro },
  )
}

/** Publicar o retirar. No toca el cobro: registrar un pago no publica y publicar no marca pagado. */
export function cambiarEstadoAnuncio(torneoId: string, id: string, estado: Anuncio['estado']) {
  return transaccion(torneoId, (lista) => lista.map((a) => (a.id === id ? { ...a, estado } : a)))
}

export function borrarAnuncio(torneoId: string, id: string) {
  return transaccion(torneoId, (lista) => lista.filter((a) => a.id !== id), { [id]: null })
}

/** Sube o baja un anuncio regular dentro de su jornada; renumera para que el orden quede 1, 2, 3… */
export function moverAnuncio(torneoId: string, id: string, paso: -1 | 1) {
  return transaccion(torneoId, (lista) => {
    const anuncio = lista.find((a) => a.id === id)
    if (!anuncio) return lista
    const grupo = lista.filter((a) => a.jornada === anuncio.jornada && a.tipo === 'regular').sort(porOrden)
    const i = grupo.findIndex((a) => a.id === id)
    const j = i + paso
    if (j < 0 || j >= grupo.length) return lista
    ;[grupo[i], grupo[j]] = [grupo[j], grupo[i]]
    const nuevoOrden = new Map(grupo.map((a, k) => [a.id, k + 1]))
    return lista.map((a) => (nuevoOrden.has(a.id) ? { ...a, orden: nuevoOrden.get(a.id)! } : a))
  })
}

/** Firestore no acepta campos undefined: quita los opcionales vacíos. */
function limpiar(a: Anuncio): Anuncio {
  return Object.fromEntries(Object.entries(a).filter(([, v]) => v !== undefined && v !== '')) as unknown as Anuncio
}

export type CargaCobros = { estado: 'cargando' } | { estado: 'listo'; cobros: Record<string, Cobro> } | { estado: 'error' }

/** Importes y pagos del torneo. Solo se usa en el panel del administrador: el público no tiene permiso de leerlos. */
export function useCobros(torneoId: string): CargaCobros {
  const [carga, setCarga] = useState<CargaCobros>({ estado: 'cargando' })
  useEffect(() => {
    if (!db) return setCarga({ estado: 'listo', cobros: {} })
    setCarga({ estado: 'cargando' })
    return onSnapshot(
      doc(db, 'cobros', torneoId),
      (snap) => setCarga({ estado: 'listo', cobros: (snap.data()?.porAnuncio as Record<string, Cobro>) ?? {} }),
      (error) => {
        console.error(error)
        setCarga({ estado: 'error' })
      },
    )
  }, [torneoId])
  return carga
}
