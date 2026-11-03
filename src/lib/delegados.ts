import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
} from 'firebase/firestore'
import { useEffect, useState } from 'react'
import type { Captura, DatosJugador, Evento, Partido, Solicitud, Torneo, Usuario } from '../types'
import { db } from './firebase'

// Lo que escriben los delegados va en colecciones aparte del torneo: así las reglas de Firestore
// pueden limitar a cada uno a su equipo, y el torneo solo lo modifica el administrador.

function base() {
  if (!db) throw new Error('Firebase no está configurado (src/lib/firebase.ts)')
  return db
}

const milisegundos = (valor: unknown) => (valor as { toMillis?: () => number } | undefined)?.toMillis?.()

/** Escucha una colección filtrada por igualdad. Con `filtros` en null no consulta nada (por ejemplo, sin torneo). */
function useConsulta<T>(ruta: string, filtros: Record<string, string> | null, convertir: (id: string, d: DocumentData) => T) {
  const [datos, setDatos] = useState<T[] | null>(null)
  const clave = JSON.stringify([ruta, filtros])
  useEffect(() => {
    if (!filtros) return
    const consulta = query(collection(base(), ruta), ...Object.entries(filtros).map(([campo, valor]) => where(campo, '==', valor)))
    return onSnapshot(
      consulta,
      (snap) => setDatos(snap.docs.map((d) => convertir(d.id, d.data({ serverTimestamps: 'estimate' })))),
      (error) => {
        console.error(error)
        setDatos([])
      },
    )
  }, [clave])
  return datos
}

// ---------- Cuentas ----------

const aUsuario = (uid: string, d: DocumentData): Usuario => ({ ...(d as Omit<Usuario, 'uid'>), uid, creadoEn: milisegundos(d.creadoEn) })

/** La ficha de una cuenta, en tiempo real: así el delegado entra en cuanto el administrador le asigna su equipo. */
export function escucharUsuario(uid: string, alCambiar: (u: Usuario | null) => void, alFallar: () => void) {
  return onSnapshot(
    doc(base(), 'usuarios', uid),
    (d) => alCambiar(d.exists() ? aUsuario(d.id, d.data({ serverTimestamps: 'estimate' })) : null),
    alFallar,
  )
}

/** Todas las cuentas; solo el administrador puede leerlas. */
export function useUsuarios() {
  return useConsulta('usuarios', {}, aUsuario)
}

/** Ficha de una cuenta recién registrada: queda pendiente hasta que el administrador le asigna un equipo. */
export async function solicitarCuenta(uid: string, datos: { nombre: string; correo: string; equipoSolicitado: string }) {
  await setDoc(doc(base(), 'usuarios', uid), { rol: 'pendiente', ...datos, creadoEn: serverTimestamp() })
}

export async function asignarEquipo(uid: string, equipoId: string, equipoNombre: string) {
  await updateDoc(doc(base(), 'usuarios', uid), { rol: 'delegado', equipoId, equipoNombre })
}

export async function quitarAcceso(uid: string) {
  await updateDoc(doc(base(), 'usuarios', uid), { rol: 'pendiente', equipoId: deleteField(), equipoNombre: deleteField() })
}

/** Borra la ficha de una solicitud de cuenta rechazada; la cuenta de Authentication queda sin acceso. */
export async function rechazarCuenta(uid: string) {
  await deleteDoc(doc(base(), 'usuarios', uid))
}

// ---------- Capturas ----------

/** Una captura por equipo y partido, con id fijo para que el delegado la reemplace al corregirla. */
export function idCaptura(torneoId: string, partidoId: string, equipoId: string) {
  return `${torneoId}_${partidoId}_${equipoId}`
}

const aCaptura = (id: string, d: DocumentData): Captura => ({ ...(d as Omit<Captura, 'id'>), id, enviadoEn: milisegundos(d.enviadoEn) })

export function useCapturas(torneoId: string | undefined, equipoId?: string) {
  return useConsulta('capturas', torneoId ? { torneoId, ...(equipoId && { equipoId }) } : null, aCaptura)
}

export async function guardarCaptura(datos: { torneoId: string; partidoId: string; equipoId: string; eventos: Evento[]; enviadoPor: string }) {
  await setDoc(doc(base(), 'capturas', idCaptura(datos.torneoId, datos.partidoId, datos.equipoId)), {
    ...datos,
    cerrada: false,
    enviadoEn: serverTimestamp(),
  })
}

/** Al publicar el partido, las capturas de los delegados se cierran (RN-013). */
export async function cerrarCapturas(ids: string[]) {
  if (!ids.length) return
  const lote = writeBatch(base())
  for (const id of ids) lote.update(doc(base(), 'capturas', id), { cerrada: true })
  await lote.commit()
}

/** Solo el administrador: al quitar un resultado, los delegados pueden volver a capturar. */
export async function reabrirCapturas(ids: string[]) {
  if (!ids.length) return
  const lote = writeBatch(base())
  for (const id of ids) lote.update(doc(base(), 'capturas', id), { cerrada: false })
  await lote.commit()
}

/**
 * Junta lo que capturó cada delegado. De cada captura solo se toman los eventos de su propio equipo
 * (sus goles, incluidos los autogoles a favor, y sus tarjetas), aunque alguien manipule los datos.
 */
export function eventosDeCapturas(capturas: Captura[]): Evento[] {
  return capturas.flatMap((c) => c.eventos.filter((e) => e.equipoId === c.equipoId))
}

export const PLAZO_CAPTURA_HORAS = 24

export function yaSeJugo(p: Partido): boolean {
  return !!p.fecha && new Date(p.fecha).getTime() <= Date.now()
}

/** Hora límite para que los delegados capturen (RN-017); sin fecha no hay plazo. */
export function venceCaptura(p: Partido, t: Torneo): number | undefined {
  if (!p.fecha) return undefined
  return new Date(p.fecha).getTime() + (t.plazoCapturaHoras ?? PLAZO_CAPTURA_HORAS) * 3_600_000
}

// ---------- Solicitudes de jugadores ----------

const aSolicitud = (id: string, d: DocumentData): Solicitud => ({ ...(d as Omit<Solicitud, 'id'>), id, creadoEn: milisegundos(d.creadoEn) })

export function useSolicitudes(torneoId: string | undefined, equipoId?: string) {
  return useConsulta('solicitudes', torneoId ? { torneoId, ...(equipoId && { equipoId }) } : null, aSolicitud)
}

export async function pedirAltas(torneoId: string, equipoId: string, creadoPor: string, jugadores: DatosJugador[]) {
  const lote = writeBatch(base())
  for (const datos of jugadores) {
    lote.set(doc(collection(base(), 'solicitudes')), {
      torneoId,
      equipoId,
      tipo: 'alta',
      datos,
      estado: 'pendiente',
      creadoPor,
      creadoEn: serverTimestamp(),
    })
  }
  await lote.commit()
}

export async function pedirBaja(torneoId: string, equipoId: string, creadoPor: string, jugadorId: string) {
  await setDoc(doc(collection(base(), 'solicitudes')), {
    torneoId,
    equipoId,
    tipo: 'baja',
    jugadorId,
    estado: 'pendiente',
    creadoPor,
    creadoEn: serverTimestamp(),
  })
}

export async function borrarSolicitudes(ids: string[]) {
  const lote = writeBatch(base())
  for (const id of ids) lote.delete(doc(base(), 'solicitudes', id))
  await lote.commit()
}

/** El delegado ve la solicitud rechazada hasta que la descarta. */
export async function rechazarSolicitud(id: string) {
  await updateDoc(doc(base(), 'solicitudes', id), { estado: 'rechazada' })
}
