import { createContext, useContext, useMemo, type ReactNode } from 'react'
import type { Equipo, Jugador, Torneo } from '../types'

interface ContextoTorneo {
  torneo: Torneo
  equipo: (id: string) => Equipo
  jugador: (id: string) => Jugador | undefined
}

const Contexto = createContext<ContextoTorneo | null>(null)

/** Da a toda la app el torneo elegido y búsquedas rápidas de equipos y jugadores por id. */
export function ProveedorTorneo({ torneo, children }: { torneo: Torneo; children: ReactNode }) {
  const valor = useMemo(() => {
    const equipos = new Map(torneo.equipos.map((e) => [e.id, e]))
    const jugadores = new Map(torneo.jugadores.map((j) => [j.id, j]))
    return { torneo, equipo: (id: string) => equipos.get(id)!, jugador: (id: string) => jugadores.get(id) }
  }, [torneo])
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>
}

export function useTorneo(): ContextoTorneo {
  const valor = useContext(Contexto)
  if (!valor) throw new Error('useTorneo debe usarse dentro de ProveedorTorneo')
  return valor
}
