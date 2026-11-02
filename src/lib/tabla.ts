import type { Equipo, Partido, Torneo } from '../types'
import { estaPublicado, golesDe, juegaEn, porFecha, resultadoDe, type Resultado } from './partidos'

export const LUGARES_LIGUILLA = 8

/** Puntos de juego limpio por tarjeta; menos es mejor. */
const PUNTOS_AMARILLA = 1
const PUNTOS_ROJA = 3

export interface FilaTabla {
  equipo: Equipo
  juegos: number
  ganados: number
  empatados: number
  perdidos: number
  aFavor: number
  enContra: number
  diferencia: number
  puntos: number
  /** Últimos 5 resultados, el más reciente al final. */
  racha: Resultado[]
}

/** Suma los partidos de un equipo con 3 puntos por victoria y 1 por empate (RN-001). */
export function resumirEquipo(equipo: Equipo, partidos: Partido[]): FilaTabla {
  const fila: FilaTabla = {
    equipo,
    juegos: 0,
    ganados: 0,
    empatados: 0,
    perdidos: 0,
    aFavor: 0,
    enContra: 0,
    diferencia: 0,
    puntos: 0,
    racha: [],
  }
  const resultados: Resultado[] = []
  for (const p of partidos) {
    if (!juegaEn(p, equipo.id)) continue
    const { aFavor, enContra } = golesDe(p, equipo.id)
    const resultado = resultadoDe(p, equipo.id)
    fila.juegos++
    fila.aFavor += aFavor
    fila.enContra += enContra
    if (resultado === 'G') fila.ganados++
    else if (resultado === 'E') fila.empatados++
    else fila.perdidos++
    resultados.push(resultado)
  }
  fila.diferencia = fila.aFavor - fila.enContra
  fila.puntos = fila.ganados * 3 + fila.empatados
  fila.racha = resultados.slice(-5)
  return fila
}

/** Partidos publicados de la fase regular, del más antiguo al más reciente. */
export function partidosRegulares(t: Torneo): Partido[] {
  return t.partidos.filter((p) => p.fase === 'regular' && estaPublicado(p)).sort(porFecha)
}

/**
 * Tabla general con el desempate de la Liga MX (RN-002): puntos, diferencia de goles, goles a favor,
 * resultado entre los empatados, goles como visitante, juego limpio y sorteo.
 */
export function calcularTabla(t: Torneo): FilaTabla[] {
  const partidos = partidosRegulares(t)
  const filas = t.equipos.map((e) => resumirEquipo(e, partidos))
  const general = (a: FilaTabla, b: FilaTabla) =>
    b.puntos - a.puntos || b.diferencia - a.diferencia || b.aFavor - a.aFavor
  filas.sort(general)

  const tabla: FilaTabla[] = []
  for (let i = 0; i < filas.length; ) {
    let j = i + 1
    while (j < filas.length && general(filas[i], filas[j]) === 0) j++
    const grupo = filas.slice(i, j)
    tabla.push(...(grupo.length > 1 ? desempatar(grupo, partidos) : grupo))
    i = j
  }
  return tabla
}

function desempatar(grupo: FilaTabla[], partidos: Partido[]): FilaTabla[] {
  const ids = new Set(grupo.map((f) => f.equipo.id))
  const entreEllos = partidos.filter((p) => ids.has(p.localId) && ids.has(p.visitanteId))
  const criterios = new Map(
    grupo.map((f) => {
      let golesVisitante = 0
      let juegoLimpio = 0
      for (const p of partidos) {
        if (p.visitanteId === f.equipo.id) golesVisitante += golesDe(p, f.equipo.id).aFavor
        for (const e of p.eventos) {
          if (e.equipoId !== f.equipo.id) continue
          if (e.tipo === 'amarilla') juegoLimpio += PUNTOS_AMARILLA
          if (e.tipo === 'roja') juegoLimpio += PUNTOS_ROJA
        }
      }
      return [f.equipo.id, { directo: resumirEquipo(f.equipo, entreEllos), golesVisitante, juegoLimpio }]
    }),
  )
  return [...grupo].sort((a, b) => {
    const ca = criterios.get(a.equipo.id)!
    const cb = criterios.get(b.equipo.id)!
    return (
      cb.directo.puntos - ca.directo.puntos ||
      cb.directo.diferencia - ca.directo.diferencia ||
      cb.golesVisitante - ca.golesVisitante ||
      ca.juegoLimpio - cb.juegoLimpio ||
      // El sorteo lo hace el administrador; mientras tanto se ordena por nombre.
      a.equipo.nombre.localeCompare(b.equipo.nombre)
    )
  })
}
