import type { Equipo, Evento, Jugador, Partido, Sancion, Suspension, Torneo } from '../types'
import { armarLlaves, cruzar, RONDAS, sembrar, type Sembrado } from '../lib/liguilla'
import { calcularTabla, LUGARES_LIGUILLA } from '../lib/tabla'

// Datos de ejemplo de la fase 1: dos torneos ficticios que se generan con una semilla fija,
// así la tabla y las estadísticas salen iguales en cada recarga. En la fase 2 los reemplaza Firestore.

type Azar = () => number

/** Generador pseudoaleatorio (mulberry32): con la misma semilla da siempre la misma secuencia. */
function crearAzar(semilla: number): Azar {
  let estado = semilla >>> 0
  return () => {
    estado = (estado + 0x6d2b79f5) >>> 0
    let t = estado
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function semillaDe(texto: string): number {
  let h = 2166136261
  for (const c of texto) h = Math.imul(h ^ c.charCodeAt(0), 16777619)
  return h >>> 0
}

function elegir<T>(azar: Azar, lista: T[]): T {
  return lista[Math.floor(azar() * lista.length)]
}

function elegirPonderado<T>(azar: Azar, lista: T[], peso: (x: T) => number): T {
  let resto = azar() * lista.reduce((suma, x) => suma + peso(x), 0)
  for (const x of lista) {
    resto -= peso(x)
    if (resto <= 0) return x
  }
  return lista[lista.length - 1]
}

/** Cuántos goles o tarjetas hay en un partido, alrededor de la media indicada. */
function poisson(azar: Azar, media: number): number {
  const limite = Math.exp(-media)
  let k = 0
  let p = azar()
  while (p > limite) {
    k++
    p *= azar()
  }
  return k
}

function sumarDias(fecha: string, dias: number): string {
  const d = new Date(`${fecha}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + dias)
  return d.toISOString().slice(0, 10)
}

const EQUIPOS: Record<string, [nombre: string, corto: string, color: string]> = {
  halcones: ['Halcones FC', 'HAL', '#c0392b'],
  morelos: ['Deportivo Morelos', 'MOR', '#1f6f43'],
  santafe: ['Atlético Santa Fe', 'ASF', '#7b2d8b'],
  arboledas: ['Real Arboledas', 'RAR', '#1d4e89'],
  toros: ['Toros del Norte', 'TOR', '#8a4b08'],
  obrera: ['Unión Obrera', 'UOB', '#b03a5b'],
  libertad: ['Juventud Libertad', 'JUV', '#0e7c86'],
  aztecas: ['Club Aztecas', 'AZT', '#a0522d'],
  lomas: ['Sporting Lomas', 'SPL', '#2c3e50'],
  tigrillos: ['Tigrillos FC', 'TIG', '#d35400'],
  galacticos: ['Galácticos', 'GAL', '#5b4bb7'],
  centro: ['Racing Centro', 'RAC', '#2471a3'],
  valle: ['Inter del Valle', 'IDV', '#117a65'],
  jardines: ['Dínamo Jardines', 'DIN', '#9c640c'],
  ferro: ['Ferrocarrileros', 'FER', '#566573'],
  sur: ['Estrella del Sur', 'ESU', '#922b21'],
}

// La Copa tiene inscripción aparte: comparte varios equipos con la Liga, pero no todos.
const EN_LIGA = ['halcones', 'morelos', 'santafe', 'arboledas', 'toros', 'obrera', 'libertad', 'aztecas', 'lomas', 'tigrillos', 'galacticos', 'centro', 'valle']
const EN_COPA = ['halcones', 'morelos', 'santafe', 'arboledas', 'toros', 'obrera', 'libertad', 'lomas', 'tigrillos', 'centro', 'valle', 'jardines', 'ferro', 'sur']

const NOMBRES = ['Juan', 'Luis', 'Carlos', 'Jorge', 'Miguel', 'José', 'Alejandro', 'Diego', 'Fernando', 'Ricardo', 'Eduardo', 'Óscar', 'Raúl', 'Iván', 'Héctor', 'Andrés', 'Pablo', 'Sergio', 'Mario', 'Gerardo', 'Arturo', 'Emilio', 'Rodrigo', 'Kevin', 'Brandon', 'Erick', 'Omar', 'Hugo', 'Javier', 'Samuel']
const APELLIDOS = ['Hernández', 'García', 'Martínez', 'López', 'González', 'Pérez', 'Rodríguez', 'Sánchez', 'Ramírez', 'Cruz', 'Flores', 'Gómez', 'Morales', 'Vázquez', 'Reyes', 'Jiménez', 'Torres', 'Díaz', 'Gutiérrez', 'Ruiz', 'Mendoza', 'Aguilar', 'Ortiz', 'Castillo', 'Romero', 'Álvarez', 'Chávez', 'Rivera', 'Juárez', 'Domínguez']

const JUGADORES_POR_EQUIPO = 12

/** Horarios de una jornada: [días después del sábado, hora]. */
const HORARIOS: [number, string][] = [
  [0, '09:00'],
  [0, '10:45'],
  [0, '12:30'],
  [0, '16:00'],
  [1, '09:00'],
  [1, '10:45'],
  [1, '12:30'],
]
const CANCHAS = ['Cancha 1', 'Cancha 2']

function crearEquipo(id: string): Equipo {
  const [nombre, corto, color] = EQUIPOS[id]
  return { id, nombre, corto, color }
}

/** El plantel depende solo del equipo, así un equipo inscrito en la Liga y en la Copa tiene los mismos jugadores. */
function crearPlantel(equipoId: string): Jugador[] {
  const azar = crearAzar(semillaDe(equipoId))
  const numeros = [1]
  while (numeros.length < JUGADORES_POR_EQUIPO) {
    const n = 2 + Math.floor(azar() * 24)
    if (!numeros.includes(n)) numeros.push(n)
  }
  return numeros
    .sort((a, b) => a - b)
    .map((numero) => ({
      id: `${equipoId}-${numero}`,
      equipoId,
      numero,
      nombre: `${elegir(azar, NOMBRES)} ${elegir(azar, APELLIDOS)} ${elegir(azar, APELLIDOS)[0]}.`,
    }))
}

/** Los delanteros (7, 9, 10 y 11) anotan más; el portero (1) casi nunca. */
function pesoGol(j: Jugador): number {
  if (j.numero === 1) return 0.05
  return [7, 9, 10, 11].includes(j.numero) ? 4 : 1
}

/** Todos contra todos a una vuelta (método del círculo). Con número impar, en cada jornada descansa uno distinto. */
function calendario(ids: string[]): [string, string][][] {
  const lista: (string | null)[] = ids.length % 2 ? [...ids, null] : [...ids]
  const n = lista.length
  const jornadas: [string, string][][] = []
  for (let r = 0; r < n - 1; r++) {
    const partidos: [string, string][] = []
    for (let i = 0; i < n / 2; i++) {
      const a = lista[i]
      const b = lista[n - 1 - i]
      if (a === null || b === null) continue
      // Alternar la localía para que ningún equipo sea siempre local.
      partidos.push(r % 2 === 0 ? [a, b] : [b, a])
    }
    jornadas.push(partidos)
    lista.splice(1, 0, lista.pop()!)
  }
  return jornadas
}

interface Simulacion {
  azar: Azar
  planteles: Map<string, Jugador[]>
  /** Qué tan bueno es cada equipo, de 0.7 a 1.4. */
  fuerza: Map<string, number>
}

function prepararSimulacion(semilla: number, equipos: Equipo[]): Simulacion {
  const azar = crearAzar(semilla)
  return {
    azar,
    planteles: new Map(equipos.map((e) => [e.id, crearPlantel(e.id)])),
    fuerza: new Map(equipos.map((e) => [e.id, 0.7 + azar() * 0.7])),
  }
}

function eventosDeEquipo(azar: Azar, plantel: Jugador[], goles: number, golesTiempoExtra: number): Evento[] {
  const equipoId = plantel[0].equipoId
  const eventos: Evento[] = []
  for (let i = 0; i < goles + golesTiempoExtra; i++) {
    const tiempoExtra = i >= goles || undefined
    if (azar() < 0.04) {
      eventos.push({ tipo: 'gol', equipoId, autogol: true, tiempoExtra })
      continue
    }
    const autor = elegirPonderado(azar, plantel, pesoGol)
    const companeros = plantel.filter((j) => j.id !== autor.id && j.numero !== 1)
    const asistenciaId = azar() < 0.6 ? elegir(azar, companeros).id : undefined
    eventos.push({ tipo: 'gol', equipoId, jugadorId: autor.id, asistenciaId, tiempoExtra })
  }

  const amonestados = new Set<string>()
  const amarillas = poisson(azar, 1.4)
  for (let i = 0; i < amarillas; i++) {
    const j = elegir(azar, plantel)
    if (amonestados.has(j.id)) continue
    amonestados.add(j.id)
    eventos.push({ tipo: 'amarilla', equipoId, jugadorId: j.id })
  }
  if (amonestados.size > 0 && azar() < 0.05) {
    eventos.push({ tipo: 'roja', equipoId, jugadorId: elegir(azar, [...amonestados]), dobleAmarilla: true })
  } else if (azar() < 0.05) {
    eventos.push({ tipo: 'roja', equipoId, jugadorId: elegir(azar, plantel).id })
  }
  return eventos
}

interface Forzado {
  goles?: [number, number]
  tiempoExtra?: [number, number]
}

function jugar(p: Partido, { azar, planteles, fuerza }: Simulacion, forzado: Forzado = {}) {
  const local = fuerza.get(p.localId)!
  const visitante = fuerza.get(p.visitanteId)!
  const [gl, gv] = forzado.goles ?? [poisson(azar, (1.5 * local) / visitante), poisson(azar, (1.3 * visitante) / local)]
  const [tl, tv] = forzado.tiempoExtra ?? [0, 0]
  p.eventos = [
    ...eventosDeEquipo(azar, planteles.get(p.localId)!, gl, tl),
    ...eventosDeEquipo(azar, planteles.get(p.visitanteId)!, gv, tv),
  ]
  p.estado = 'finalizado'
}

function faseRegular(prefijo: string, equipos: Equipo[], sim: Simulacion, inicio: string, jugadas: number): Partido[] {
  const partidos: Partido[] = []
  calendario(equipos.map((e) => e.id)).forEach((jornada, r) => {
    const sabado = sumarDias(inicio, r * 7)
    jornada.forEach(([localId, visitanteId], i) => {
      const [dia, hora] = HORARIOS[i]
      const p: Partido = {
        id: `${prefijo}-j${r + 1}-${i + 1}`,
        fase: 'regular',
        jornada: r + 1,
        fecha: `${sumarDias(sabado, dia)}T${hora}`,
        cancha: CANCHAS[i % 2],
        localId,
        visitanteId,
        estado: 'programado',
        eventos: [],
      }
      if (r < jugadas) jugar(p, sim)
      partidos.push(p)
    })
  })
  return partidos
}

/** El administrador decide cuántos partidos; en el ejemplo, 2 por roja directa y 1 por doble amarilla. */
function suspensionesPorRojas(partidos: Partido[]): Suspension[] {
  return partidos
    .filter((p) => p.estado === 'finalizado')
    .flatMap((p) =>
      p.eventos.flatMap((e): Suspension[] =>
        e.tipo === 'roja'
          ? [{ jugadorId: e.jugadorId, partidoId: p.id, partidos: e.dobleAmarilla ? 1 : 2, motivo: e.dobleAmarilla ? 'Doble amarilla' : 'Roja directa' }]
          : [],
      ),
    )
}

function marcarAdministrativo(p: Partido, responsableId: string, motivo: string) {
  p.estado = 'administrativo'
  p.eventos = []
  p.administrativo = { responsableId, motivo }
}

/** Liga en curso: jornada 9 de 13, con un partido de cada estado para ver cómo se muestran. */
function crearLiga(): Torneo {
  const equipos = EN_LIGA.map(crearEquipo)
  const sim = prepararSimulacion(2026, equipos)
  const partidos = faseRegular('ap26', equipos, sim, '2026-09-05', 9)
  const deJornada = (n: number) => partidos.filter((p) => p.jornada === n)

  const porDefault = deJornada(4)[2]
  marcarAdministrativo(porDefault, porDefault.visitanteId, 'No presentó credenciales')
  const aplazado = deJornada(6)[1]
  aplazado.estado = 'aplazado'
  aplazado.eventos = []
  aplazado.fecha = ''
  const ultima = deJornada(9)
  ultima[ultima.length - 1].estado = 'revision'

  const sanciones: Sancion[] = [
    { equipoId: deJornada(5)[0].visitanteId, descripcion: 'Captura tardía de la jornada 5', fecha: '2026-10-05' },
  ]
  return {
    id: 'liga-apertura-2026',
    tipo: 'liga',
    nombre: 'Apertura 2026',
    estado: 'regular',
    equipos,
    jugadores: [...sim.planteles.values()].flat(),
    partidos,
    suspensiones: suspensionesPorRojas(partidos),
    sanciones,
  }
}

/** Liguilla completa: cuartos 1-8, 2-7, 3-6 y 4-5, reacomodo en semifinales y una final que se va a penales. */
function agregarLiguilla(torneo: Torneo, sim: Simulacion, inicio: string) {
  const tabla = calcularTabla(torneo)
  let sembrados: Sembrado[] = sembrar(tabla, LUGARES_LIGUILLA)
  let sabado = inicio
  for (const ronda of RONDAS) {
    cruzar(sembrados).forEach(([alto, bajo], i) => {
      const hora = HORARIOS[i][1]
      const comun = { fase: 'liguilla' as const, ronda: ronda.id, llave: i + 1, cancha: CANCHAS[i % 2], estado: 'programado' as const }
      // El peor sembrado es local en la ida; el mejor cierra en casa.
      const ida: Partido = { ...comun, id: `${torneo.id}-${ronda.id}-${i + 1}-ida`, vuelta: 'ida', fecha: `${sabado}T${hora}`, localId: bajo.equipo.id, visitanteId: alto.equipo.id, eventos: [] }
      const vuelta: Partido = { ...comun, id: `${torneo.id}-${ronda.id}-${i + 1}-vuelta`, vuelta: 'vuelta', fecha: `${sumarDias(sabado, 7)}T${hora}`, localId: alto.equipo.id, visitanteId: bajo.equipo.id, eventos: [] }
      if (ronda.id === 'final') {
        // Global empatado incluso tras el tiempo extra, para mostrar cómo se ven los penales (RN-015).
        jugar(ida, sim, { goles: [1, 1] })
        jugar(vuelta, sim, { goles: [0, 0], tiempoExtra: [1, 1] })
        vuelta.penales = { local: 3, visitante: 4 }
      } else {
        jugar(ida, sim)
        jugar(vuelta, sim)
      }
      torneo.partidos.push(ida, vuelta)
    })
    sabado = sumarDias(sabado, 14)
    sembrados = armarLlaves(torneo, tabla)
      .filter((l) => l.ronda === ronda.id)
      .flatMap((l) => (l.ganador ? [l.ganador] : []))
  }
}

/** Copa anterior, ya terminada. */
function crearCopa(): Torneo {
  const equipos = EN_COPA.map(crearEquipo)
  const sim = prepararSimulacion(1974, equipos)
  const inicio = '2026-04-11'
  const partidos = faseRegular('pr26', equipos, sim, inicio, 13)
  const porDefault = partidos.filter((p) => p.jornada === 8)[3]
  marcarAdministrativo(porDefault, porDefault.localId, 'El campo no estaba en condiciones')

  const torneo: Torneo = {
    id: 'copa-primavera-2026',
    tipo: 'copa',
    nombre: 'Primavera 2026',
    estado: 'terminado',
    equipos,
    jugadores: [...sim.planteles.values()].flat(),
    partidos,
    suspensiones: [],
    sanciones: [],
  }
  agregarLiguilla(torneo, sim, sumarDias(inicio, 13 * 7))
  return torneo
}

export const torneosDeEjemplo: Torneo[] = [crearLiga(), crearCopa()]
