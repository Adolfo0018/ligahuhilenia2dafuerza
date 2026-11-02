import type { Liga } from '../types'
import ligaJson from './liga.json'

// Anotar el tipo hace que `npm run build` falle si el JSON tiene un campo mal escrito.
export const liga: Liga = ligaJson
