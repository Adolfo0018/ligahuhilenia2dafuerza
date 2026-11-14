import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { db, firebaseConfigurado } from './firebase'

/**
 * Qué se ve en el sitio público. El administrador lo decide desde el panel y aplica a todos los torneos.
 * Se guarda en `configuracion/sitio` como la lista de lo que está oculto; lo que no está en la lista se ve.
 */
export const PARTES = [
  { id: 'partidos', nombre: 'Partidos' },
  {
    id: 'clasificacion',
    nombre: 'Clasificación',
    hijos: [
      { id: 'clasificacion.tabla', nombre: 'Tabla general' },
      { id: 'clasificacion.liguilla', nombre: 'Liguilla' },
    ],
  },
  {
    id: 'estadisticas',
    nombre: 'Estadísticas',
    hijos: [
      { id: 'estadisticas.goleadores', nombre: 'Goleadores' },
      { id: 'estadisticas.asistencias', nombre: 'Asistencias' },
      { id: 'estadisticas.tarjetas', nombre: 'Tarjetas' },
      { id: 'estadisticas.equipos', nombre: 'Equipos' },
      { id: 'estadisticas.disciplina', nombre: 'Suspendidos y sanciones' },
    ],
  },
  { id: 'acceso', nombre: 'Enlace “Acceso para administradores” al pie de la página' },
] as const

type Parte = (typeof PARTES)[number]
type Hijo = Extract<Parte, { hijos: unknown }>['hijos'][number]
export type IdParte = Parte['id'] | Hijo['id']

export interface ConfigSitio {
  ocultos: IdParte[]
}

const VACIA: ConfigSitio = { ocultos: [] }

/** Una sección se ve si no está oculta y, si tiene apartados, si al menos uno se ve. */
export function seVe(config: ConfigSitio, id: IdParte): boolean {
  if (config.ocultos.includes(id)) return false
  const padre = id.includes('.') ? (id.split('.')[0] as IdParte) : null
  if (padre) return !config.ocultos.includes(padre)
  const parte = PARTES.find((p) => p.id === id)
  return !parte || !('hijos' in parte) || parte.hijos.some((h) => !config.ocultos.includes(h.id))
}

export type CargaConfig = { estado: 'cargando' } | { estado: 'listo'; config: ConfigSitio }

/** Configuración en tiempo real. Si no se puede leer, se muestra todo para no dejar el sitio vacío. */
export function useConfigSitio(): CargaConfig {
  const [carga, setCarga] = useState<CargaConfig>(() => (firebaseConfigurado ? { estado: 'cargando' } : { estado: 'listo', config: VACIA }))
  useEffect(() => {
    if (!db) return
    return onSnapshot(
      doc(db, 'configuracion', 'sitio'),
      (d) => {
        const ocultos = d.data()?.ocultos
        setCarga({ estado: 'listo', config: { ocultos: Array.isArray(ocultos) ? ocultos : [] } })
      },
      () => setCarga({ estado: 'listo', config: VACIA }),
    )
  }, [])
  return carga
}

export async function guardarConfigSitio(config: ConfigSitio): Promise<void> {
  if (!db) throw new Error('Firebase no está configurado (src/lib/firebase.ts)')
  await setDoc(doc(db, 'configuracion', 'sitio'), { ocultos: config.ocultos, actualizadoEn: serverTimestamp() })
}
