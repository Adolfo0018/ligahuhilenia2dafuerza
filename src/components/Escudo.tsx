import type { CSSProperties } from 'react'
import type { Equipo } from '../types'

export function Escudo({ equipo, chico = false }: { equipo: Equipo; chico?: boolean }) {
  return (
    <span
      className={chico ? 'escudo escudo-chico' : 'escudo'}
      style={{ '--escudo': equipo.color } as CSSProperties}
      aria-hidden="true"
    >
      {equipo.corto}
    </span>
  )
}
