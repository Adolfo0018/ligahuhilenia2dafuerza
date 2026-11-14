import { useState, type CSSProperties } from 'react'
import type { Equipo } from '../types'

/**
 * Escudos oficiales: un archivo por equipo en src/assets/escudos, con el id del equipo como nombre
 * (por ejemplo "eq-bodka-jr-huhi.webp"). Vite los publica como archivos estáticos con caché; no se leen de Firebase.
 * Un equipo sin archivo no genera ninguna descarga y muestra sus iniciales.
 */
const ARCHIVOS = import.meta.glob<string>('../assets/escudos/*.{webp,png,jpg,jpeg,svg}', {
  eager: true,
  query: '?url',
  import: 'default',
})

const ESCUDOS = new Map(
  Object.entries(ARCHIVOS).map(([ruta, url]) => [ruta.split('/').pop()!.replace(/\.[^.]+$/, ''), url]),
)

/** Imágenes que no cargaron en esta visita: no se vuelven a pedir. */
const FALLIDOS = new Set<string>()

export function urlEscudo(equipoId: string): string | undefined {
  const url = ESCUDOS.get(equipoId)
  return url && !FALLIDOS.has(url) ? url : undefined
}

export function Escudo({ equipo, chico = false }: { equipo: Equipo; chico?: boolean }) {
  const url = urlEscudo(equipo.id)
  // Si la imagen no carga, se queda con las iniciales.
  const [fallo, setFallo] = useState<string | null>(null)
  const clase = chico ? 'escudo escudo-chico' : 'escudo'

  if (url && fallo !== url) {
    return (
      <img
        className={`${clase} escudo-imagen`}
        src={url}
        alt=""
        aria-hidden="true"
        loading="lazy"
        decoding="async"
        width={chico ? 24 : 32}
        height={chico ? 24 : 32}
        onError={() => {
          FALLIDOS.add(url)
          setFallo(url)
        }}
      />
    )
  }
  return (
    <span className={clase} style={equipo.color ? ({ '--escudo': equipo.color } as CSSProperties) : undefined} aria-hidden="true">
      {equipo.corto}
    </span>
  )
}
