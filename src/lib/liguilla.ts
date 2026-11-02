import type { Equipo, Partido, Ronda, Torneo } from '../types'
import { estaPublicado, golesDe } from './partidos'
import type { FilaTabla } from './tabla'

export const RONDAS: { id: Ronda; nombre: string }[] = [
  { id: 'cuartos', nombre: 'Cuartos de final' },
  { id: 'semifinal', nombre: 'Semifinales' },
  { id: 'final', nombre: 'Final' },
]

export interface Sembrado {
  equipo: Equipo
  /** Lugar en la tabla de la fase regular. */
  lugar: number
}

export function sembrar(tabla: FilaTabla[], cuantos: number): Sembrado[] {
  return tabla.slice(0, cuantos).map((f, i) => ({ equipo: f.equipo, lugar: i + 1 }))
}

/** El mejor sembrado contra el peor: 1-8, 2-7, 3-6 y 4-5 en cuartos, y reacomodo en semifinales (RN-005). */
export function cruzar(sembrados: Sembrado[]): [Sembrado, Sembrado][] {
  const orden = [...sembrados].sort((a, b) => a.lugar - b.lugar)
  const cruces: [Sembrado, Sembrado][] = []
  for (let i = 0; i < orden.length / 2; i++) cruces.push([orden[i], orden[orden.length - 1 - i]])
  return cruces
}

export interface Llave {
  ronda: Ronda
  numero: number
  /** El mejor colocado en la fase regular; cierra la vuelta en casa. */
  alto: Sembrado
  bajo: Sembrado
  ida?: Partido
  vuelta?: Partido
  /** Solo cuando la ida y la vuelta ya están publicadas. */
  global?: { alto: number; bajo: number }
  penales?: { alto: number; bajo: number }
  ganador?: Sembrado
  /** Cómo se decidió un empate en el global. */
  desempate?: 'posicion' | 'penales'
}

export function armarLlaves(t: Torneo, tabla: FilaTabla[]): Llave[] {
  const lugares = new Map(tabla.map((f, i) => [f.equipo.id, i + 1]))
  const equipos = new Map(t.equipos.map((e) => [e.id, e]))
  const grupos = new Map<string, Partido[]>()
  for (const p of t.partidos) {
    if (p.fase !== 'liguilla' || !p.ronda || !p.llave) continue
    const clave = `${p.ronda}-${p.llave}`
    grupos.set(clave, [...(grupos.get(clave) ?? []), p])
  }

  const llaves: Llave[] = []
  for (const partidos of grupos.values()) {
    const [a, b] = [partidos[0].localId, partidos[0].visitanteId].map((id) => ({
      equipo: equipos.get(id)!,
      lugar: lugares.get(id) ?? Infinity,
    }))
    const [alto, bajo] = a.lugar < b.lugar ? [a, b] : [b, a]
    const ida = partidos.find((p) => p.vuelta === 'ida')
    const vuelta = partidos.find((p) => p.vuelta === 'vuelta')
    const llave: Llave = { ronda: partidos[0].ronda!, numero: partidos[0].llave!, alto, bajo, ida, vuelta }

    if (ida && vuelta && estaPublicado(ida) && estaPublicado(vuelta)) {
      const global = (id: string) => golesDe(ida, id).aFavor + golesDe(vuelta, id).aFavor
      llave.global = { alto: global(alto.equipo.id), bajo: global(bajo.equipo.id) }
      if (llave.global.alto !== llave.global.bajo) {
        llave.ganador = llave.global.alto > llave.global.bajo ? alto : bajo
      } else if (llave.ronda !== 'final') {
        // En cuartos y semifinales el empate lo gana el mejor colocado (RN-004).
        llave.ganador = alto
        llave.desempate = 'posicion'
      } else if (vuelta.penales) {
        // En la final, si sigue empatado tras el tiempo extra, se define en penales (RN-015).
        const { local, visitante } = vuelta.penales
        llave.penales = vuelta.localId === alto.equipo.id ? { alto: local, bajo: visitante } : { alto: visitante, bajo: local }
        llave.ganador = llave.penales.alto > llave.penales.bajo ? alto : bajo
        llave.desempate = 'penales'
      }
    }
    llaves.push(llave)
  }
  const orden = RONDAS.map((r) => r.id)
  return llaves.sort((x, y) => orden.indexOf(x.ronda) - orden.indexOf(y.ronda) || x.numero - y.numero)
}
