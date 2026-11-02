import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  writeBatch,
  type DocumentData,
} from 'firebase/firestore'
import type { TipoCompetencia, Torneo } from '../types'
import { db } from './firebase'

const TORNEOS = 'torneos'

/** Lo que se guarda de un torneo; el id es el del documento y las fechas las pone el servidor. */
export type DatosTorneo = Omit<Torneo, 'id' | 'creadoEn'>

function base() {
  if (!db) throw new Error('Firebase no está configurado (src/lib/firebase.ts)')
  return db
}

function aTorneo(id: string, d: DocumentData): Torneo {
  return {
    id,
    tipo: d.tipo,
    nombre: d.nombre,
    estado: d.estado,
    equipos: d.equipos ?? [],
    jugadores: d.jugadores ?? [],
    partidos: d.partidos ?? [],
    suspensiones: d.suspensiones ?? [],
    sanciones: d.sanciones ?? [],
    creadoEn: d.creadoEn?.toMillis() ?? Date.now(),
  }
}

/** Escucha todos los torneos en tiempo real: al publicar un resultado, la vista se actualiza sin recargar (RNF-004). */
export function escucharTorneos(alCambiar: (torneos: Torneo[]) => void, alFallar: (error: Error) => void) {
  return onSnapshot(
    collection(base(), TORNEOS),
    (snap) => alCambiar(snap.docs.map((d) => aTorneo(d.id, d.data({ serverTimestamps: 'estimate' })))),
    alFallar,
  )
}

export interface NuevoTorneo {
  tipo: TipoCompetencia
  nombre: string
  /** Torneo del que se copian equipos y jugadores; la inscripción de cada torneo es aparte. */
  copiarDe?: Torneo
  /** Torneos en curso que pasan a terminados: solo hay uno en curso a la vez. */
  terminar: Torneo[]
}

export async function crearTorneo({ tipo, nombre, copiarDe, terminar }: NuevoTorneo): Promise<string> {
  const lote = writeBatch(base())
  const ref = doc(collection(base(), TORNEOS))
  const datos: DatosTorneo = {
    tipo,
    nombre,
    estado: 'regular',
    equipos: copiarDe?.equipos ?? [],
    jugadores: copiarDe?.jugadores ?? [],
    partidos: [],
    suspensiones: [],
    sanciones: [],
  }
  lote.set(ref, { ...datos, creadoEn: serverTimestamp(), actualizadoEn: serverTimestamp() })
  for (const t of terminar) lote.update(doc(base(), TORNEOS, t.id), { estado: 'terminado', actualizadoEn: serverTimestamp() })
  await lote.commit()
  return ref.id
}

/** Lee la versión más reciente del torneo, le aplica el cambio y la guarda en una transacción, para no pisar otros cambios. */
export async function modificarTorneo(id: string, cambio: (t: Torneo) => Partial<DatosTorneo>): Promise<void> {
  await runTransaction(base(), async (tx) => {
    const ref = doc(base(), TORNEOS, id)
    const actual = await tx.get(ref)
    if (!actual.exists()) throw new Error('El torneo ya no existe')
    tx.update(ref, { ...cambio(aTorneo(id, actual.data())), actualizadoEn: serverTimestamp() })
  })
}

export async function borrarTorneo(id: string): Promise<void> {
  await deleteDoc(doc(base(), TORNEOS, id))
}
