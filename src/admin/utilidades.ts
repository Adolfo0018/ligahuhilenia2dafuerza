/** Id corto y único para equipos, jugadores y partidos. */
export function nuevoId(prefijo: string): string {
  return `${prefijo}-${crypto.randomUUID().slice(0, 8)}`
}

/** Para comparar nombres sin importar mayúsculas, acentos ni espacios de más. */
export function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

const PALABRAS_VACIAS = new Set(['de', 'del', 'la', 'las', 'los', 'el', 'fc', 'club'])

/** Abreviatura de 3 letras para el escudo: "Toros del Norte" → "TON", "Halcones FC" → "HAL". */
export function abreviar(nombre: string): string {
  const palabras = normalizar(nombre)
    .split(' ')
    .filter((p) => p && !PALABRAS_VACIAS.has(p))
  if (!palabras.length) return normalizar(nombre).replace(/\s/g, '').slice(0, 3).toUpperCase()
  const corto =
    palabras.length === 1
      ? palabras[0].slice(0, 3)
      : palabras.length === 2
        ? palabras[0].slice(0, 2) + palabras[1][0]
        : palabras.map((p) => p[0]).join('')
  return corto.slice(0, 3).toUpperCase()
}

export const COLORES_EQUIPO = [
  '#c0392b',
  '#1f6f43',
  '#7b2d8b',
  '#1d4e89',
  '#8a4b08',
  '#b03a5b',
  '#0e7c86',
  '#a0522d',
  '#2c3e50',
  '#d35400',
  '#5b4bb7',
  '#2471a3',
  '#117a65',
  '#9c640c',
  '#566573',
  '#922b21',
]
