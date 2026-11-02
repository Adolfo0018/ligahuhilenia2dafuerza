import type { Partido, Torneo } from '../types'

export type Resultado = 'G' | 'E' | 'P'

/** Solo los partidos publicados cuentan para la tabla y las estadísticas (RN-008). */
export function estaPublicado(p: Partido): boolean {
  return p.estado === 'finalizado' || p.estado === 'administrativo'
}

export interface Marcador {
  local: number
  visitante: number
  /** Hubo goles en tiempo extra (solo pasa en la final). */
  tiempoExtra: boolean
}

/** Goles de cada lado, incluido el tiempo extra. El resultado administrativo es 2-0 para el rival del responsable (RN-007). */
export function marcador(p: Partido): Marcador {
  if (p.estado === 'administrativo' && p.administrativo) {
    const ganaLocal = p.administrativo.responsableId === p.visitanteId
    return { local: ganaLocal ? 2 : 0, visitante: ganaLocal ? 0 : 2, tiempoExtra: false }
  }
  const m: Marcador = { local: 0, visitante: 0, tiempoExtra: false }
  for (const e of p.eventos) {
    if (e.tipo !== 'gol') continue
    if (e.equipoId === p.localId) m.local++
    else m.visitante++
    if (e.tiempoExtra) m.tiempoExtra = true
  }
  return m
}

export function juegaEn(p: Partido, equipoId: string): boolean {
  return p.localId === equipoId || p.visitanteId === equipoId
}

export function golesDe(p: Partido, equipoId: string) {
  const m = marcador(p)
  return p.localId === equipoId ? { aFavor: m.local, enContra: m.visitante } : { aFavor: m.visitante, enContra: m.local }
}

/** Un empate que se definió en penales sigue contando como empate. */
export function resultadoDe(p: Partido, equipoId: string): Resultado {
  const { aFavor, enContra } = golesDe(p, equipoId)
  return aFavor > enContra ? 'G' : aFavor < enContra ? 'P' : 'E'
}

/** Por fecha; los aplazados sin fecha van al final. */
export function porFecha(a: Partido, b: Partido): number {
  if (!a.fecha) return b.fecha ? 1 : 0
  if (!b.fecha) return -1
  return a.fecha.localeCompare(b.fecha)
}

/** La última jornada con algún resultado publicado; es la que se muestra al abrir Partidos. */
export function jornadaActual(t: Torneo): number {
  const jugadas = t.partidos.filter((p) => p.fase === 'regular' && estaPublicado(p)).map((p) => p.jornada ?? 1)
  return jugadas.length ? Math.max(...jugadas) : 1
}
