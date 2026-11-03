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

export type RolCuerpoTecnico = 'tecnico' | 'auxiliar' | 'medico'

export interface MiembroCuerpoTecnico {
  rol: RolCuerpoTecnico
  nombre: string
}

export interface Equipo {
  id: string
  nombre: string
  /** Abreviatura de 3 letras que va en el escudo. */
  corto: string
  /** Color del escudo. */
  color: string
  /** Como en el listín: director técnico, hasta dos auxiliares y médico. */
  cuerpoTecnico?: MiembroCuerpoTecnico[]
}

export type Posicion = 'portero' | 'defensa' | 'carrilero' | 'medio' | 'delantero'

export interface Jugador {
  id: string
  equipoId: string
  nombre: string
  /** Opcional: en el listín de la liga el número de camiseta se anota en cada partido. */
  numero?: number
  posicion?: Posicion
  /** Menor de edad; en el listín se marca con "(M)". Solo se muestra en el panel del administrador. */
  menor?: boolean
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
  /** Horas que tienen los delegados para capturar después de la hora del partido (RF-025). Por defecto, 24. */
  plazoCapturaHoras?: number
  /** Milisegundos; lo pone el servidor al crear el torneo. */
  creadoEn?: number
}

export type Rol = 'admin' | 'delegado' | 'pendiente'

/** Ficha de una cuenta en la colección "usuarios"; el id es el UID de Authentication. */
export interface Usuario {
  uid: string
  rol: Rol
  nombre?: string
  correo?: string
  /** Equipo que representa un delegado. Los equipos conservan su id al copiarse a otro torneo. */
  equipoId?: string
  equipoNombre?: string
  /** Lo que eligió al registrarse; el administrador confirma o cambia el equipo. */
  equipoSolicitado?: string
  creadoEn?: number
}

/** Lo que capturó el delegado de un equipo para un partido; el administrador la revisa y publica (RN-006). */
export interface Captura {
  id: string
  torneoId: string
  partidoId: string
  equipoId: string
  eventos: Evento[]
  /** Al publicarse el partido se cierra y el delegado ya no la puede cambiar (RN-013). */
  cerrada: boolean
  enviadoPor: string
  enviadoEn?: number
}

export interface DatosJugador {
  nombre: string
  numero?: number
  posicion?: Posicion
  menor?: boolean
}

/** Alta o baja de un jugador pedida por un delegado; queda pendiente hasta que el administrador la resuelve (RF-012). */
export interface Solicitud {
  id: string
  torneoId: string
  equipoId: string
  tipo: 'alta' | 'baja'
  /** Solo en una baja. */
  jugadorId?: string
  /** Solo en un alta. */
  datos?: DatosJugador
  estado: 'pendiente' | 'rechazada'
  creadoPor: string
  creadoEn?: number
}
