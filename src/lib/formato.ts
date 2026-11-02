import type { Liga, Torneo } from '../types'

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
