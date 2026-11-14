import { estaPublicado, juegaEn, marcador } from '../lib/partidos'
import type { Equipo, Evento, Partido, Torneo } from '../types'
import { nuevoId, normalizar } from './utilidades'

/**
 * Calendario pegado desde Excel o Google Sheets (RF-029). Una fila por partido, en este orden de columnas:
 * Jornada | Local | Visitante | Fecha | Hora | Cancha | Goles local | Goles visitante.
 * Solo Jornada, Local y Visitante son obligatorias. Si la primera fila trae los títulos, se usa para ubicar las columnas.
 */
export const COLUMNAS = ['Jornada', 'Local', 'Visitante', 'Fecha', 'Hora', 'Cancha', 'Goles local', 'Goles visitante'] as const
type Columna = 'jornada' | 'local' | 'visitante' | 'fecha' | 'hora' | 'cancha' | 'gl' | 'gv'
const ORDEN: Columna[] = ['jornada', 'local', 'visitante', 'fecha', 'hora', 'cancha', 'gl', 'gv']

/** Para reconocer los títulos aunque vengan con otras palabras. */
const TITULOS: [Columna, RegExp][] = [
  ['jornada', /^(jornada|j|jor|fecha n|ronda)$/],
  ['local', /^(local|casa|equipo local)$/],
  ['visitante', /^(visitante|visita|equipo visitante)$/],
  ['fecha', /^(fecha|dia|día)$/],
  ['hora', /^(hora|horario)$/],
  ['cancha', /^(cancha|sede|lugar|campo|estadio)$/],
  ['gl', /^(goles local|gl|gol local|marcador local)$/],
  ['gv', /^(goles visitante|gv|gol visitante|marcador visitante)$/],
]

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

export interface FilaLeida {
  linea: number
  jornada?: number
  localId?: string
  visitanteId?: string
  /** "2026-11-15"; vacío si no venía. */
  dia?: string
  /** "12:00"; vacío si no venía. */
  hora?: string
  cancha?: string
  goles?: { local: number; visitante: number }
  textoLocal: string
  textoVisitante: string
  errores: string[]
}

export type TipoCambio = 'nuevo' | 'actualiza' | 'igual' | 'error'

export interface Cambio {
  fila: FilaLeida
  tipo: TipoCambio
  partidoId?: string
  /** Qué cambia, en palabras: "fecha, cancha, resultado 2-1". */
  detalle: string
}

const dos = (n: number) => String(n).padStart(2, '0')

function separar(linea: string): string[] {
  const sep = linea.includes('\t') ? '\t' : linea.includes(';') ? ';' : ','
  // Comillas al estilo CSV: "Huhi, Yucatán" es una sola celda.
  const celdas: string[] = []
  let actual = ''
  let comillas = false
  for (let i = 0; i < linea.length; i++) {
    const c = linea[i]
    if (c === '"') {
      if (comillas && linea[i + 1] === '"') {
        actual += '"'
        i++
      } else comillas = !comillas
    } else if (c === sep && !comillas) {
      celdas.push(actual)
      actual = ''
    } else actual += c
  }
  celdas.push(actual)
  return celdas.map((c) => c.trim())
}

/** Acepta 15/11/2026, 15/11/26, 2026-11-15, 15 nov 2026, "15 de noviembre de 2026" y el número de serie de Excel. */
export function leerDia(texto: string, anioPorDefecto: number): string | null {
  const t = normalizar(texto).replace(/\bde\b/g, ' ').replace(/\s+/g, ' ').trim()
  if (!t) return ''
  let m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (m) return valido(+m[1], +m[2], +m[3])
  m = t.match(/^(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2,4}))?/)
  if (m) return valido(anio(m[3], anioPorDefecto), +m[2], +m[1])
  m = t.match(/^(?:[a-z]+\.?,? )?(\d{1,2}) ([a-z]+)\.?(?: (\d{2,4}))?/)
  if (m) {
    const mes = MESES.findIndex((nombre) => m![2].startsWith(nombre)) + 1
    return mes ? valido(anio(m[3], anioPorDefecto), mes, +m[1]) : null
  }
  if (/^\d{5}$/.test(t)) {
    // Excel cuenta los días desde el 30 de diciembre de 1899.
    const d = new Date(Date.UTC(1899, 11, 30) + Number(t) * 86400000)
    return valido(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate())
  }
  return null
}

function anio(texto: string | undefined, porDefecto: number): number {
  if (!texto) return porDefecto
  const n = Number(texto)
  return n < 100 ? 2000 + n : n
}

function valido(a: number, m: number, d: number): string | null {
  const f = new Date(a, m - 1, d)
  return f.getFullYear() === a && f.getMonth() === m - 1 && f.getDate() === d ? `${a}-${dos(m)}-${dos(d)}` : null
}

/** Acepta 9:30, 12:00, 12.00, 12:00 p. m., 4 PM y la fracción de día de Excel. */
export function leerHora(texto: string): string | null {
  if (/^0?\.\d+$/.test(texto.trim())) {
    const minutos = Math.round(Number(texto) * 24 * 60)
    return `${dos(Math.floor(minutos / 60) % 24)}:${dos(minutos % 60)}`
  }
  const t = normalizar(texto).replace(/\./g, '').replace(/\s+/g, '')
  if (!t) return ''
  const m = t.match(/^(\d{1,2})(?::|h)?(\d{2})?(am|pm)?$/) ?? t.match(/^(\d{1,2}):(\d{2}):\d{2}(am|pm)?$/)
  if (m) {
    let h = Number(m[1])
    const min = Number(m[2] ?? 0)
    if (m[3] === 'pm' && h < 12) h += 12
    if (m[3] === 'am' && h === 12) h = 0
    return h < 24 && min < 60 ? `${dos(h)}:${dos(min)}` : null
  }
  return null
}

/** Clave para reconocer un equipo aunque venga sin espacios, sin acentos o con su abreviatura. */
const clave = (texto: string) => normalizar(texto).replace(/[^a-z0-9]/g, '')

export function buscarEquipo(equipos: Equipo[], texto: string): Equipo | undefined {
  const k = clave(texto)
  if (!k) return undefined
  return (
    equipos.find((e) => clave(e.nombre) === k) ??
    equipos.find((e) => clave(e.corto) === k) ??
    // "Bodka" encuentra "BODKA JR HUHI" si ningún otro equipo empieza igual.
    (() => {
      const parecidos = equipos.filter((e) => clave(e.nombre).startsWith(k) || k.startsWith(clave(e.nombre)))
      return parecidos.length === 1 ? parecidos[0] : undefined
    })()
  )
}

export function leerCalendario(texto: string, torneo: Torneo): FilaLeida[] {
  const lineas = texto.replace(/\r/g, '').split('\n')
  const anioPorDefecto = new Date().getFullYear()
  let columnas = ORDEN
  const filas: FilaLeida[] = []
  lineas.forEach((linea, i) => {
    if (!linea.trim()) return
    const celdas = separar(linea)
    // Una fila de títulos define el orden de las columnas.
    const titulos = celdas.map((c) => TITULOS.find(([, re]) => re.test(normalizar(c)))?.[0])
    if (titulos.filter(Boolean).length >= 2 && titulos.includes('local')) {
      columnas = titulos.map((t) => t ?? ('' as Columna))
      return
    }
    const valor = (col: Columna) => {
      const j = columnas.indexOf(col)
      const v = j >= 0 ? (celdas[j] ?? '') : ''
      return v === '-' ? '' : v
    }
    const errores: string[] = []
    const fila: FilaLeida = { linea: i + 1, textoLocal: valor('local'), textoVisitante: valor('visitante'), errores }

    const j = Number(valor('jornada').replace(/^j(ornada)?\s*/i, ''))
    if (Number.isInteger(j) && j >= 1 && j <= 60) fila.jornada = j
    else errores.push(`jornada “${valor('jornada')}” no es un número de 1 a 60`)

    const local = buscarEquipo(torneo.equipos, fila.textoLocal)
    const visitante = buscarEquipo(torneo.equipos, fila.textoVisitante)
    if (local) fila.localId = local.id
    else errores.push(fila.textoLocal ? `no encontré al equipo “${fila.textoLocal}”` : 'falta el local')
    if (visitante) fila.visitanteId = visitante.id
    else errores.push(fila.textoVisitante ? `no encontré al equipo “${fila.textoVisitante}”` : 'falta el visitante')
    if (local && visitante && local.id === visitante.id) errores.push('el local y el visitante son el mismo equipo')

    // La fecha puede traer la hora pegada, como en la app de resultados: "15 nov 2026 12:00".
    let textoFecha = valor('fecha')
    let textoHora = valor('hora')
    const horaPegada = textoFecha.match(/\s(\d{1,2}[:.]\d{2}\s*([ap]\.?\s*m\.?)?)$/i)
    if (horaPegada && !textoHora) {
      textoHora = horaPegada[1]
      textoFecha = textoFecha.slice(0, horaPegada.index).trim()
    }
    const dia = leerDia(textoFecha, anioPorDefecto)
    if (dia === null) errores.push(`no entendí la fecha “${textoFecha}”`)
    else fila.dia = dia
    const hora = leerHora(textoHora)
    if (hora === null) errores.push(`no entendí la hora “${textoHora}”`)
    else fila.hora = hora
    if (fila.hora && !fila.dia) errores.push('trae hora pero no fecha')

    fila.cancha = valor('cancha').slice(0, 40)

    const gl = valor('gl')
    const gv = valor('gv')
    if (gl || gv) {
      const a = Number(gl)
      const b = Number(gv)
      if (gl === '' || gv === '' || !Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b < 0 || a > 30 || b > 30) {
        errores.push(`el marcador “${gl}-${gv}” no es válido`)
      } else fila.goles = { local: a, visitante: b }
    }
    filas.push(fila)
  })
  return filas
}

function golesSinAutor(p: Partido, goles: { local: number; visitante: number }): Evento[] {
  return [
    ...Array.from({ length: goles.local }, (): Evento => ({ tipo: 'gol', equipoId: p.localId })),
    ...Array.from({ length: goles.visitante }, (): Evento => ({ tipo: 'gol', equipoId: p.visitanteId })),
  ]
}

/**
 * Compara lo pegado con los partidos del torneo y devuelve qué pasaría con cada fila, y los partidos resultantes.
 * Un partido ya existente (misma pareja en la fase regular) se actualiza; si no existe, se crea.
 * Los resultados se cargan sin goleadores; uno ya publicado con otro marcador no se toca.
 */
export function planear(torneo: Torneo, filas: FilaLeida[]): { cambios: Cambio[]; partidos: Partido[] } {
  let partidos = [...torneo.partidos]
  const nombre = (id: string) => torneo.equipos.find((e) => e.id === id)?.nombre ?? id
  const cambios: Cambio[] = []
  const tocados = new Set<string>()

  for (const fila of filas) {
    if (fila.errores.length || !fila.localId || !fila.visitanteId || !fila.jornada) {
      cambios.push({ fila, tipo: 'error', detalle: fila.errores.join('; ') })
      continue
    }
    const { localId, visitanteId, jornada } = fila
    const existente = partidos.find((p) => p.fase === 'regular' && juegaEn(p, localId) && juegaEn(p, visitanteId))
    if (existente && tocados.has(existente.id)) {
      cambios.push({ fila, tipo: 'error', detalle: 'este partido ya viene en otra fila' })
      continue
    }
    if (existente && existente.localId !== localId) {
      cambios.push({
        fila,
        tipo: 'error',
        detalle: `ya existe como ${nombre(existente.localId)} vs ${nombre(existente.visitanteId)} en la jornada ${existente.jornada}; a una vuelta no se puede repetir con la localía al revés`,
      })
      continue
    }
    const base: Partido = existente ?? { id: nuevoId('pa'), fase: 'regular', jornada, fecha: '', cancha: '', localId, visitanteId, estado: 'programado', eventos: [] }
    const nuevo: Partido = { ...base, jornada }
    const detalle: string[] = []
    if (existente && existente.jornada !== jornada) detalle.push(`jornada ${existente.jornada} → ${jornada}`)
    if (fila.dia) {
      // Sin hora se conserva la que tenía; 00:00 significa "hora por definir".
      const fecha = `${fila.dia}T${fila.hora || base.fecha.split('T')[1] || '00:00'}`
      if (fecha !== base.fecha) {
        nuevo.fecha = fecha
        detalle.push(base.fecha ? 'fecha y hora' : 'fecha')
      }
      if (nuevo.estado === 'aplazado') nuevo.estado = 'programado'
    }
    if (fila.cancha && normalizar(fila.cancha) !== normalizar(base.cancha)) {
      nuevo.cancha = fila.cancha
      detalle.push('cancha')
    }
    if (fila.goles) {
      if (estaPublicado(base)) {
        const m = marcador(base)
        if (m.local !== fila.goles.local || m.visitante !== fila.goles.visitante) {
          cambios.push({
            fila,
            tipo: 'error',
            detalle: `ya tiene publicado ${m.local}-${m.visitante}; si cambió, corrígelo en el partido para no perder los goleadores`,
          })
          continue
        }
      } else {
        nuevo.estado = 'finalizado'
        nuevo.eventos = [...golesSinAutor(nuevo, fila.goles), ...base.eventos.filter((e) => e.tipo !== 'gol')]
        detalle.push(`resultado ${fila.goles.local}-${fila.goles.visitante}`)
      }
    }
    tocados.add(nuevo.id)
    if (!existente) {
      partidos.push(nuevo)
      cambios.push({ fila, tipo: 'nuevo', partidoId: nuevo.id, detalle: detalle.length ? `partido nuevo con ${detalle.join(', ')}` : 'partido nuevo' })
    } else if (detalle.length) {
      partidos = partidos.map((p) => (p.id === nuevo.id ? nuevo : p))
      cambios.push({ fila, tipo: 'actualiza', partidoId: nuevo.id, detalle: detalle.join(', ') })
    } else {
      cambios.push({ fila, tipo: 'igual', partidoId: nuevo.id, detalle: 'sin cambios' })
    }
  }

  // Cada equipo juega una sola vez por jornada (RN-012). Se marca la fila que lo provoca.
  for (const c of cambios) {
    if (c.tipo !== 'nuevo' && c.tipo !== 'actualiza') continue
    const p = partidos.find((x) => x.id === c.partidoId)!
    const choque = partidos.find(
      (x) => x.id !== p.id && x.fase === 'regular' && x.jornada === p.jornada && (juegaEn(x, p.localId) || juegaEn(x, p.visitanteId)),
    )
    // Si este partido no cambió de jornada y el otro sí (o es nuevo), el error es de la otra fila.
    const seMovio = (id: string) => !torneo.partidos.some((x) => x.id === id && x.jornada === partidos.find((y) => y.id === id)?.jornada)
    if (choque && !seMovio(p.id) && seMovio(choque.id)) continue
    if (choque) {
      const equipo = juegaEn(choque, p.localId) ? p.localId : p.visitanteId
      c.tipo = 'error'
      c.detalle = `${nombre(equipo)} ya juega en la jornada ${p.jornada} (${nombre(choque.localId)} vs ${nombre(choque.visitanteId)})`
    }
  }
  // Los partidos de filas con error no se guardan: se rehace la lista solo con los cambios válidos.
  const validos = new Map(cambios.filter((c) => c.tipo === 'nuevo' || c.tipo === 'actualiza').map((c) => [c.partidoId!, c]))
  const finales = torneo.partidos.map((p) => (validos.has(p.id) ? partidos.find((x) => x.id === p.id)! : p))
  for (const c of validos.values()) if (c.tipo === 'nuevo') finales.push(partidos.find((x) => x.id === c.partidoId)!)
  return { cambios, partidos: finales }
}

/** CSV del calendario actual, para abrirlo en Excel, editarlo y volver a pegarlo. */
export function exportarCalendario(torneo: Torneo): string {
  const nombre = (id: string) => torneo.equipos.find((e) => e.id === id)?.nombre ?? ''
  const celda = (v: string | number) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v))
  const filas = torneo.partidos
    .filter((p) => p.fase === 'regular')
    .sort((a, b) => (a.jornada ?? 0) - (b.jornada ?? 0) || a.fecha.localeCompare(b.fecha))
    .map((p) => {
      const [dia, hora] = p.fecha ? p.fecha.split('T') : ['', '']
      const [a, m, d] = dia ? dia.split('-') : []
      const g = estaPublicado(p) ? marcador(p) : null
      return [p.jornada ?? '', nombre(p.localId), nombre(p.visitanteId), dia ? `${d}/${m}/${a}` : '', hora === '00:00' ? '' : (hora ?? ''), p.cancha, g?.local ?? '', g?.visitante ?? '']
    })
  // El BOM hace que Excel respete los acentos.
  return '﻿' + [COLUMNAS as readonly string[], ...filas].map((f) => f.map(celda).join(',')).join('\r\n')
}
