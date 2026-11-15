import { collection, deleteDoc, doc, onSnapshot, query, serverTimestamp, setDoc, updateDoc, where, type DocumentData } from 'firebase/firestore'
import { createContext, createElement, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Evento, Partido } from '../types'
import { db } from './firebase'

/**
 * Marcador en vivo. Un documento por partido en `envivo/{torneoId}_{partidoId}`, aparte del torneo, para que cada
 * gol solo mueva ese documento y no el torneo completo. Cualquiera de los dos delegados del partido (o el administrador)
 * marca el inicio, el medio tiempo y el final; cada delegado suma solo los goles de su equipo.
 * No cuenta para la tabla: al terminar, el administrador revisa y publica el resultado, y entonces se borra.
 */
export type EstadoEnVivo = 'primer' | 'medio' | 'segundo' | 'final'

export interface GolEnVivo {
  jugadorId?: string
  asistenciaId?: string
}

export interface EnVivo {
  id: string
  torneoId: string
  partidoId: string
  localId: string
  visitanteId: string
  estado: EstadoEnVivo
  /** Milisegundos; los pone el servidor. */
  inicioEn?: number
  reanudadoEn?: number
  golesLocal: GolEnVivo[]
  golesVisitante: GolEnVivo[]
}

const COLECCION = 'envivo'

function base() {
  if (!db) throw new Error('Firebase no está configurado (src/lib/firebase.ts)')
  return db
}

const milisegundos = (valor: unknown) => (valor as { toMillis?: () => number } | undefined)?.toMillis?.()

export const idEnVivo = (torneoId: string, partidoId: string) => `${torneoId}_${partidoId}`

function aEnVivo(id: string, d: DocumentData): EnVivo {
  return {
    id,
    torneoId: d.torneoId,
    partidoId: d.partidoId,
    localId: d.localId,
    visitanteId: d.visitanteId,
    estado: d.estado,
    inicioEn: milisegundos(d.inicioEn),
    reanudadoEn: milisegundos(d.reanudadoEn),
    golesLocal: d.golesLocal ?? [],
    golesVisitante: d.golesVisitante ?? [],
  }
}

/** Los partidos en vivo (o terminados sin publicar) del torneo, en tiempo real. Solo hay documentos mientras se juegan. */
export function useEnVivo(torneoId: string | undefined): EnVivo[] {
  const [lista, setLista] = useState<EnVivo[]>([])
  useEffect(() => {
    if (!db || !torneoId) return
    return onSnapshot(
      query(collection(db, COLECCION), where('torneoId', '==', torneoId)),
      (snap) => setLista(snap.docs.map((d) => aEnVivo(d.id, d.data({ serverTimestamps: 'estimate' })))),
      (error) => {
        console.error(error)
        setLista([])
      },
    )
  }, [torneoId])
  return lista
}

const Contexto = createContext<EnVivo[]>([])

export function ProveedorEnVivo({ torneoId, children }: { torneoId: string | undefined; children: ReactNode }) {
  const lista = useEnVivo(torneoId)
  return createElement(Contexto.Provider, { value: lista }, children)
}

/** Todos los marcadores en vivo del torneo, del proveedor (una sola escucha por página). */
export function useEnVivoTorneo(): EnVivo[] {
  return useContext(Contexto)
}

/** El marcador en vivo de un partido, si lo hay y corresponde a sus mismos equipos. */
export function useEnVivoDe(partido: Partido): EnVivo | undefined {
  const lista = useContext(Contexto)
  return lista.find((v) => v.partidoId === partido.id && v.localId === partido.localId && v.visitanteId === partido.visitanteId)
}

export function marcadorEnVivo(v: EnVivo) {
  return { local: v.golesLocal.length, visitante: v.golesVisitante.length }
}

/** Goles en vivo como eventos, para prellenar la captura del delegado o la revisión del administrador. */
export function eventosEnVivo(v: EnVivo, equipoId?: string): Evento[] {
  const lado = (goles: GolEnVivo[], id: string): Evento[] =>
    goles.map((g) => ({ tipo: 'gol', equipoId: id, ...(g.jugadorId && { jugadorId: g.jugadorId }), ...(g.asistenciaId && { asistenciaId: g.asistenciaId }) }))
  return [
    ...(!equipoId || equipoId === v.localId ? lado(v.golesLocal, v.localId) : []),
    ...(!equipoId || equipoId === v.visitanteId ? lado(v.golesVisitante, v.visitanteId) : []),
  ]
}

/** "1.er tiempo · 23'" mientras corre; "Medio tiempo"; "Final · por confirmar". */
export function textoEnVivo(v: EnVivo, ahora = Date.now()): string {
  const minutos = (desde?: number) => (desde ? Math.max(1, Math.floor((ahora - desde) / 60000) + 1) : null)
  if (v.estado === 'primer') return `1.er tiempo${minutos(v.inicioEn) ? ` · ${minutos(v.inicioEn)}'` : ''}`
  if (v.estado === 'segundo') return `2.º tiempo${minutos(v.reanudadoEn) ? ` · ${minutos(v.reanudadoEn)}'` : ''}`
  if (v.estado === 'medio') return 'Medio tiempo'
  return 'Final · por confirmar'
}

/** Reloj que se refresca cada 30 segundos, para los minutos del partido. */
export function useAhora(activo: boolean): number {
  const [ahora, setAhora] = useState(() => Date.now())
  useEffect(() => {
    if (!activo) return
    const t = setInterval(() => setAhora(Date.now()), 30000)
    return () => clearInterval(t)
  }, [activo])
  return ahora
}

export async function iniciarPartido(torneoId: string, p: Partido) {
  await setDoc(doc(base(), COLECCION, idEnVivo(torneoId, p.id)), {
    torneoId,
    partidoId: p.id,
    localId: p.localId,
    visitanteId: p.visitanteId,
    estado: 'primer',
    inicioEn: serverTimestamp(),
    golesLocal: [],
    golesVisitante: [],
    actualizadoEn: serverTimestamp(),
  })
}

export async function cambiarEstado(v: EnVivo, estado: EstadoEnVivo) {
  await updateDoc(doc(base(), COLECCION, v.id), {
    estado,
    ...(estado === 'segundo' && { reanudadoEn: serverTimestamp() }),
    actualizadoEn: serverTimestamp(),
  })
}

/** Cada delegado escribe solo la lista de goles de su equipo (las reglas lo exigen). */
export async function guardarGoles(v: EnVivo, equipoId: string, goles: GolEnVivo[]) {
  // Firestore no acepta campos undefined dentro de listas.
  const limpios = goles.map((g) => ({ ...(g.jugadorId && { jugadorId: g.jugadorId }), ...(g.asistenciaId && { asistenciaId: g.asistenciaId }) }))
  await updateDoc(doc(base(), COLECCION, v.id), {
    [equipoId === v.localId ? 'golesLocal' : 'golesVisitante']: limpios,
    actualizadoEn: serverTimestamp(),
  })
}

/** Solo el administrador: al publicar el resultado o para descartar un en vivo equivocado. */
export async function borrarEnVivo(id: string) {
  await deleteDoc(doc(base(), COLECCION, id))
}

/**
 * Lo que revisa el administrador antes de publicar: de cada equipo, su captura si la envió (trae tarjetas)
 * y si no, los goles que su delegado marcó en vivo.
 */
export function eventosParaRevision(partido: Partido, capturas: { equipoId: string; eventos: Evento[] }[], vivo?: EnVivo): Evento[] {
  return [partido.localId, partido.visitanteId].flatMap((id) => {
    const captura = capturas.find((c) => c.equipoId === id)
    if (captura) return captura.eventos.filter((e) => e.equipoId === id)
    return vivo ? eventosEnVivo(vivo, id) : []
  })
}
