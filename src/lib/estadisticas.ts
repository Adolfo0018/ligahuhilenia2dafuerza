import type { Equipo, Evento, Jugador, Partido, Torneo } from '../types'
import { estaPublicado, golesDe, juegaEn, porFecha } from './partidos'
import { resumirEquipo, type FilaTabla } from './tabla'

export type FiltroFase = 'regular' | 'liguilla' | 'todo'

function partidosDe(t: Torneo, filtro: FiltroFase): Partido[] {
  return t.partidos.filter((p) => estaPublicado(p) && (filtro === 'todo' || p.fase === filtro)).sort(porFecha)
}

export interface FilaJugador {
  jugador: Jugador
  valor: number
}

function contarPorJugador(t: Torneo, filtro: FiltroFase, clave: (e: Evento) => string | undefined): FilaJugador[] {
  const conteo = new Map<string, number>()
  for (const p of partidosDe(t, filtro)) {
    for (const e of p.eventos) {
      const id = clave(e)
      if (id) conteo.set(id, (conteo.get(id) ?? 0) + 1)
    }
  }
  const jugadores = new Map(t.jugadores.map((j) => [j.id, j]))
  return [...conteo]
    .flatMap(([id, valor]) => {
      const jugador = jugadores.get(id)
      return jugador ? [{ jugador, valor }] : []
    })
    .sort((a, b) => b.valor - a.valor || a.jugador.nombre.localeCompare(b.jugador.nombre))
}

/**
 * Los autogoles y el 2-0 administrativo no se le cuentan a nadie (RN-007). Los goles del tiempo extra sí cuentan;
 * los penales de la tanda no son eventos, así que tampoco (RN-015).
 */
export function goleadores(t: Torneo, filtro: FiltroFase): FilaJugador[] {
  return contarPorJugador(t, filtro, (e) => (e.tipo === 'gol' && !e.autogol ? e.jugadorId : undefined))
}

export function asistencias(t: Torneo, filtro: FiltroFase): FilaJugador[] {
  return contarPorJugador(t, filtro, (e) => (e.tipo === 'gol' ? e.asistenciaId : undefined))
}

export interface Tarjetas {
  amarillas: number
  rojas: number
}

/** La doble amarilla se guarda como 1 amarilla y 1 roja, igual que en la Liga MX (RN-014). */
function contarTarjetas(t: Torneo, filtro: FiltroFase, clave: (e: Extract<Evento, { tipo: 'amarilla' | 'roja' }>) => string) {
  const conteo = new Map<string, Tarjetas>()
  for (const p of partidosDe(t, filtro)) {
    for (const e of p.eventos) {
      if (e.tipo === 'gol') continue
      const id = clave(e)
      const actual = conteo.get(id) ?? { amarillas: 0, rojas: 0 }
      if (e.tipo === 'amarilla') actual.amarillas++
      else actual.rojas++
      conteo.set(id, actual)
    }
  }
  return conteo
}

const porTarjetas = (a: Tarjetas, b: Tarjetas) => b.rojas - a.rojas || b.amarillas - a.amarillas

export function tarjetasPorJugador(t: Torneo, filtro: FiltroFase): (Tarjetas & { jugador: Jugador })[] {
  const conteo = contarTarjetas(t, filtro, (e) => e.jugadorId)
  return t.jugadores
    .flatMap((jugador) => {
      const tarjetas = conteo.get(jugador.id)
      return tarjetas ? [{ jugador, ...tarjetas }] : []
    })
    .sort((a, b) => porTarjetas(a, b) || a.jugador.nombre.localeCompare(b.jugador.nombre))
}

export function tarjetasPorEquipo(t: Torneo, filtro: FiltroFase): (Tarjetas & { equipo: Equipo })[] {
  const conteo = contarTarjetas(t, filtro, (e) => e.equipoId)
  return t.equipos
    .map((equipo) => ({ equipo, ...(conteo.get(equipo.id) ?? { amarillas: 0, rojas: 0 }) }))
    .sort((a, b) => porTarjetas(a, b) || a.equipo.nombre.localeCompare(b.equipo.nombre))
}

export interface FilaEquipo extends FilaTabla, Tarjetas {
  sinRecibir: number
}

export function estadisticasPorEquipo(t: Torneo, filtro: FiltroFase): FilaEquipo[] {
  const partidos = partidosDe(t, filtro)
  const tarjetas = contarTarjetas(t, filtro, (e) => e.equipoId)
  return t.equipos
    .map((equipo) => ({
      ...resumirEquipo(equipo, partidos),
      ...(tarjetas.get(equipo.id) ?? { amarillas: 0, rojas: 0 }),
      sinRecibir: partidos.filter((p) => juegaEn(p, equipo.id) && golesDe(p, equipo.id).enContra === 0).length,
    }))
    .filter((f) => f.juegos > 0)
    .sort((a, b) => b.aFavor - a.aFavor || b.diferencia - a.diferencia || a.equipo.nombre.localeCompare(b.equipo.nombre))
}

export interface Suspendido {
  jugador: Jugador
  faltan: number
  motivo: string
}

/** Jugadores que no pueden jugar la próxima jornada. Al terminar el torneo las suspensiones pendientes se eliminan (RN-010). */
export function suspendidos(t: Torneo): Suspendido[] {
  if (t.estado === 'terminado') return []
  const jugadores = new Map(t.jugadores.map((j) => [j.id, j]))
  const partidos = new Map(t.partidos.map((p) => [p.id, p]))
  const publicados = t.partidos.filter(estaPublicado)
  const lista: Suspendido[] = []
  for (const s of t.suspensiones) {
    const jugador = jugadores.get(s.jugadorId)
    const origen = partidos.get(s.partidoId)
    if (!jugador || !origen) continue
    const cumplidos = publicados.filter((p) => p.fecha > origen.fecha && juegaEn(p, jugador.equipoId)).length
    const faltan = s.partidos - cumplidos
    if (faltan > 0) lista.push({ jugador, faltan, motivo: s.motivo })
  }
  return lista.sort((a, b) => b.faltan - a.faltan || a.jugador.nombre.localeCompare(b.jugador.nombre))
}
