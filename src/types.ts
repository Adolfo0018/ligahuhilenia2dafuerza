export interface Liga {
  nombre: string
  /** Vacío si la liga no tiene divisiones. */
  division: string
  /** Ruta dentro de /public, por ejemplo "/img/logo.png". Vacío = se muestran las iniciales. */
  logo: string
  colores: {
    primario: string
    textoSobrePrimario: string
    acento: string
    fondo: string
    superficie: string
    texto: string
    textoSuave: string
  }
}

export type TipoCompetencia = 'liga' | 'copa'
export type EstadoTorneo = 'regular' | 'liguilla' | 'terminado'

export interface Equipo {
  id: string
  nombre: string
  /** Abreviatura de 3 letras que va en el escudo. */
  corto: string
  /** Color del escudo. */
  color: string
}

export interface Jugador {
  id: string
  equipoId: string
  nombre: string
  numero: number
}

/** Solo `finalizado` y `administrativo` están publicados y cuentan para la tabla y las estadísticas (RN-008). */
export type EstadoPartido = 'programado' | 'aplazado' | 'revision' | 'finalizado' | 'administrativo'
export type Ronda = 'cuartos' | 'semifinal' | 'final'

export type Evento =
  | {
      tipo: 'gol'
      /** Equipo al que se le suma el gol. En un autogol es el beneficiado y no hay autor. */
      equipoId: string
      jugadorId?: string
      asistenciaId?: string
      autogol?: boolean
      /** Solo en la vuelta de la final (RN-015). */
      tiempoExtra?: boolean
    }
  | { tipo: 'amarilla'; equipoId: string; jugadorId: string }
  | { tipo: 'roja'; equipoId: string; jugadorId: string; dobleAmarilla?: boolean }

export interface Partido {
  id: string
  fase: 'regular' | 'liguilla'
  /** Solo en fase regular. */
  jornada?: number
  /** Solo en liguilla. */
  ronda?: Ronda
  /** Número de llave dentro de la ronda (de 1 a 4 en cuartos). */
  llave?: number
  vuelta?: 'ida' | 'vuelta'
  /** Hora local sin zona horaria, por ejemplo "2026-11-07T10:00". Vacío si está aplazado y aún no tiene fecha. */
  fecha: string
  cancha: string
  localId: string
  visitanteId: string
  estado: EstadoPartido
  eventos: Evento[]
  /** Resultado administrativo: el rival del responsable gana 2-0 (RN-007). */
  administrativo?: { responsableId: string; motivo: string }
  /** Solo en la vuelta de la final, si el global siguió empatado tras el tiempo extra. */
  penales?: { local: number; visitante: number }
}

export interface Suspension {
  jugadorId: string
  /** Partido en el que se originó; se cumple con los partidos publicados posteriores de su equipo. */
  partidoId: string
  partidos: number
  motivo: string
}

export interface Sancion {
  equipoId: string
  descripcion: string
  /** "2026-10-05" */
  fecha: string
}

export interface Torneo {
  id: string
  tipo: TipoCompetencia
  nombre: string
  estado: EstadoTorneo
  equipos: Equipo[]
  jugadores: Jugador[]
  partidos: Partido[]
  suspensiones: Suspension[]
  sanciones: Sancion[]
}
