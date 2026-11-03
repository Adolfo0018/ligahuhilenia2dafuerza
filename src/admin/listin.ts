import type { DatosJugador, MiembroCuerpoTecnico, Posicion, RolCuerpoTecnico, Torneo } from '../types'
import { normalizar } from './utilidades'

// Lectura del listín de jugadores de la liga; la usan el panel del administrador y el del delegado.

/** Busca, en otros equipos del torneo, a un jugador con el mismo nombre: solo puede estar en uno (RN-016). */
export function inscritoEnOtro(torneo: Torneo, equipoId: string, nombre: string, ignorarId?: string): string | undefined {
  const otro = torneo.jugadores.find(
    (j) => j.id !== ignorarId && j.equipoId !== equipoId && normalizar(j.nombre) === normalizar(nombre),
  )
  return otro && (torneo.equipos.find((eq) => eq.id === otro.equipoId)?.nombre ?? 'otro equipo')
}

const PALABRAS_POSICION: Record<string, Posicion> = {
  portero: 'portero',
  defensa: 'defensa',
  carrilero: 'carrilero',
  medio: 'medio',
  mediocampista: 'medio',
  delantero: 'delantero',
}

/** Encabezados de la tabla del listín que no son jugadores. */
const ENCABEZADOS = new Set(['no', 'no.', 'nombre', 'nombre y apellido', 'nombre y apellidos'])

/** Así marca el listín a los menores de edad: "Jean Carlos Chan Baas (M)". */
const MARCA_MENOR = /\(\s*m\s*\)/i

type Renglon = DatosJugador

/** Etiquetas de los renglones del cuerpo técnico al final del listín; "Directiva de liga" es la firma y se ignora. */
function rolDeEtiqueta(etiqueta: string): RolCuerpoTecnico | 'ignorar' | undefined {
  const t = normalizar(etiqueta).replace(/[^a-z]/g, '')
  if (['cuerpotecnico', 'directortecnico', 'tecnico', 'entrenador', 'dt'].includes(t)) return 'tecnico'
  if (t.startsWith('auxiliar')) return 'auxiliar'
  if (t === 'medico') return 'medico'
  if (t.startsWith('directiva')) return 'ignorar'
}

/**
 * Un jugador por renglón. Acepta "Juan Pérez", "10 Juan Pérez" y tablas pegadas de Word o Excel
 * (columnas separadas por tabulador), donde reconoce la posición, la marca de menor de edad,
 * los renglones del cuerpo técnico y, si se pide, el número de camiseta.
 */
export function leerLista(texto: string, conNumero: boolean): { jugadores: Renglon[]; cuerpo: MiembroCuerpoTecnico[] } {
  const cuerpo: MiembroCuerpoTecnico[] = []
  const jugadores = texto.split(/\r?\n/).flatMap((original): Renglon[] => {
    const menor = MARCA_MENOR.test(original) || undefined
    const linea = original.replace(MARCA_MENOR, ' ')
    let celdas = linea
      .split('\t')
      .map((c) => c.trim())
      .filter(Boolean)
    // "Auxiliar: Fabio Pech", escrito a mano en un solo renglón.
    if (celdas.length === 1 && celdas[0].includes(':')) celdas = celdas[0].split(/:(.*)/).map((c) => c.trim()).filter(Boolean)
    const rol = celdas.length ? rolDeEtiqueta(celdas[0]) : undefined
    if (rol) {
      const nombre = celdas.slice(1).find((c) => /\p{L}/u.test(c))
      if (rol !== 'ignorar' && nombre) cuerpo.push({ rol, nombre: nombre.replace(/\s+/g, ' ') })
      return []
    }
    const simple = celdas.length === 1 ? celdas[0].match(/^(\d{1,2})[\s.)-]+(.+)$/) : null
    if (simple) celdas = [simple[1], simple[2]]

    let nombre = ''
    let posicion: Posicion | undefined
    const antes: number[] = []
    const despues: number[] = []
    for (const c of celdas) {
      const pos = PALABRAS_POSICION[normalizar(c)]
      if (pos) posicion = pos
      else if (/^\d{1,2}$/.test(c)) (nombre ? despues : antes).push(Number(c))
      else if (/\p{L}/u.test(c) && !nombre) nombre = c.replace(/\s+/g, ' ')
    }
    if (!nombre || ENCABEZADOS.has(normalizar(nombre))) return []
    // En el listín la primera columna es el orden (1, 2, 3…); el número de camiseta va después del nombre.
    const numero = conNumero ? (despues[0] ?? (simple ? antes[0] : undefined)) : undefined
    return [{ nombre: nombre.trim(), numero, posicion, menor }]
  })
  return { jugadores, cuerpo }
}
