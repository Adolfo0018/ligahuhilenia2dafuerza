import type { Jugador, Liga, Posicion, RolCuerpoTecnico, Torneo } from '../types'

export const ROLES_CUERPO_TECNICO: Record<RolCuerpoTecnico, string> = {
  tecnico: 'Director técnico',
  auxiliar: 'Auxiliar',
  medico: 'Médico',
}

/** Lugares del cuerpo técnico en el listín de la liga. */
export const LUGARES_CUERPO_TECNICO: RolCuerpoTecnico[] = ['tecnico', 'auxiliar', 'auxiliar', 'medico']

export const POSICIONES: Record<Posicion, string> = {
  portero: 'Portero',
  defensa: 'Defensa',
  carrilero: 'Carrilero',
  medio: 'Medio',
  delantero: 'Delantero',
}

/** "9 · Juan Pérez", o solo el nombre si no tiene número. */
export function etiquetaJugador(j: Jugador): string {
  return j.numero === undefined ? j.nombre : `${j.numero} · ${j.nombre}`
}

const ORDEN_POSICION = Object.keys(POSICIONES)

/** Por número de camiseta; los que no tienen número van al final, por posición (como en el listín) y nombre. */
export function porNumero(a: Jugador, b: Jugador): number {
  const posicion = (j: Jugador) => (j.posicion ? ORDEN_POSICION.indexOf(j.posicion) : ORDEN_POSICION.length)
  return (
    (a.numero ?? Infinity) - (b.numero ?? Infinity) ||
    posicion(a) - posicion(b) ||
    a.nombre.localeCompare(b.nombre)
  )
}

const DIA = new Intl.DateTimeFormat('es-MX', { weekday: 'short', day: 'numeric', month: 'short' })
const HORA = new Intl.DateTimeFormat('es-MX', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })

/** "sáb, 31 oct · 10:00". Las fechas se guardan en hora local, sin zona horaria. */
export function fechaCorta(fecha: string): string {
  if (!fecha) return 'Fecha por definir'
  const d = new Date(fecha)
  return `${DIA.format(d)} · ${HORA.format(d)}`
}

/** Para fechas sin hora ("2026-10-05"); el mediodía evita que la zona horaria la mueva al día anterior. */
export function fechaSinHora(fecha: string): string {
  return DIA.format(new Date(`${fecha}T12:00`))
}

export function iniciales(nombre: string): string {
  return nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((palabra) => palabra[0])
    .join('')
    .toUpperCase()
}

/** "Liga Huhileña · Segunda Fuerza" */
export function nombreLiga(l: Liga): string {
  return l.division ? `${l.nombre} · ${l.division}` : l.nombre
}

export function nombreTorneo(t: Torneo): string {
  return `${t.tipo === 'liga' ? 'Liga' : 'Copa'} · ${t.nombre}`
}
