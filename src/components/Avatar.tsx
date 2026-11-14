import type { CSSProperties } from 'react'

/**
 * Iniciales de un jugador: primer nombre y apellido paterno. En los nombres del listín el paterno es el penúltimo
 * cuando hay tres palabras o más ("Carlos Daniel Dzul Dzul" → CD, "Jean Carlos Chan Baas" → JC).
 */
export function inicialesJugador(nombre: string): string {
  const palabras = nombre
    .trim()
    .split(/\s+/)
    .filter((p) => p.length > 1 || /\p{L}/u.test(p))
  if (!palabras.length) return '?'
  if (palabras.length === 1) return palabras[0].slice(0, 2).toUpperCase()
  const apellido = palabras.length >= 3 ? palabras[palabras.length - 2] : palabras[1]
  return (palabras[0][0] + apellido[0]).toUpperCase()
}

/** Avatar circular dibujado con CSS (sin fotos). Con el color del equipo si se conoce; si no, estilo neutro. */
export function Avatar({ nombre, color, chico = false }: { nombre: string; color?: string; chico?: boolean }) {
  return (
    <span
      className={chico ? 'avatar avatar-chico' : 'avatar'}
      style={color ? ({ '--avatar': color } as CSSProperties) : undefined}
      aria-hidden="true"
    >
      {inicialesJugador(nombre)}
    </span>
  )
}
