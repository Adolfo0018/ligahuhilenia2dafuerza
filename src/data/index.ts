import type { Liga, Torneo } from '../types'
import { torneosDeEjemplo } from './ejemplo'
import ligaJson from './liga.json'

// Anotar el tipo hace que `npm run build` falle si el JSON tiene un campo mal escrito.
export const liga: Liga = ligaJson

/** El torneo en curso va primero: es el que se abre por defecto (RF-001). */
export const torneos: Torneo[] = [...torneosDeEjemplo].sort(
  (a, b) => Number(a.estado === 'terminado') - Number(b.estado === 'terminado'),
)
