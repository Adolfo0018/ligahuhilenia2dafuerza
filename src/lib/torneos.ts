import { useEffect, useState } from 'react'
import { torneosDeEjemplo } from '../data/ejemplo'
import type { Torneo } from '../types'
import { firebaseConfigurado } from './firebase'
import { escucharTorneos } from './repositorio'

export type CargaTorneos = { estado: 'cargando' } | { estado: 'listo'; torneos: Torneo[] } | { estado: 'error' }

/** El torneo en curso va primero (es el que se abre por defecto, RF-001); después, del más nuevo al más viejo. */
export function ordenarTorneos(lista: Torneo[]): Torneo[] {
  return [...lista].sort(
    (a, b) =>
      Number(a.estado === 'terminado') - Number(b.estado === 'terminado') || (b.creadoEn ?? 0) - (a.creadoEn ?? 0),
  )
}

/** Torneos de Firestore en tiempo real o, si Firebase aún no está configurado, los de ejemplo. */
export function useTorneos(): CargaTorneos {
  const [carga, setCarga] = useState<CargaTorneos>(() =>
    firebaseConfigurado ? { estado: 'cargando' } : { estado: 'listo', torneos: ordenarTorneos(torneosDeEjemplo) },
  )
  useEffect(() => {
    if (!firebaseConfigurado) return
    return escucharTorneos(
      (torneos) => setCarga({ estado: 'listo', torneos: ordenarTorneos(torneos) }),
      () => setCarga({ estado: 'error' }),
    )
  }, [])
  return carga
}
