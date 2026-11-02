import { useState } from 'react'
import { useTorneo } from '../lib/contexto'
import { fechaCorta } from '../lib/formato'
import { estaPublicado, marcador } from '../lib/partidos'
import type { Equipo, EstadoPartido, Evento, Partido } from '../types'
import { Escudo } from './Escudo'

const ESTADOS: Record<EstadoPartido, string> = {
  programado: 'Programado',
  aplazado: 'Aplazado',
  revision: 'En revisión',
  finalizado: 'Final',
  administrativo: 'Por default',
}

export function TarjetaPartido({ partido, etiqueta }: { partido: Partido; etiqueta?: string }) {
  const { equipo } = useTorneo()
  const [abierto, setAbierto] = useState(false)
  const m = estaPublicado(partido) ? marcador(partido) : null
  const penales = partido.penales
  let gana: string | undefined
  if (m && (m.local !== m.visitante || penales)) {
    const ganaLocal = m.local !== m.visitante ? m.local > m.visitante : penales!.local > penales!.visitante
    gana = ganaLocal ? partido.localId : partido.visitanteId
  }
  const conDetalle = partido.estado === 'administrativo' || (partido.estado === 'finalizado' && partido.eventos.length > 0)

  const contenido = (
    <>
      <span className="partido-meta">
        <span className="partido-cuando">
          {etiqueta && <strong>{etiqueta} · </strong>}
          {fechaCorta(partido.fecha)}
          {partido.cancha && ` · ${partido.cancha}`}
        </span>
        <span className={`insignia insignia-${partido.estado}`}>{ESTADOS[partido.estado]}</span>
      </span>
      <FilaEquipo equipo={equipo(partido.localId)} goles={m?.local} pierde={!!gana && gana !== partido.localId} />
      <FilaEquipo equipo={equipo(partido.visitanteId)} goles={m?.visitante} pierde={!!gana && gana !== partido.visitanteId} />
      <Nota partido={partido} tiempoExtra={!!m?.tiempoExtra} />
      {conDetalle && <span className="partido-ver">{abierto ? 'Ocultar detalle' : 'Ver detalle'}</span>}
    </>
  )

  return (
    <article className="partido">
      {conDetalle ? (
        <button type="button" className="partido-cuerpo" aria-expanded={abierto} onClick={() => setAbierto(!abierto)}>
          {contenido}
        </button>
      ) : (
        <div className="partido-cuerpo">{contenido}</div>
      )}
      {abierto && <DetallePartido partido={partido} />}
    </article>
  )
}

function FilaEquipo({ equipo, goles, pierde }: { equipo: Equipo; goles?: number; pierde: boolean }) {
  return (
    <span className={pierde ? 'fila-equipo pierde' : 'fila-equipo'}>
      <Escudo equipo={equipo} />
      <span className="fila-nombre">{equipo.nombre}</span>
      {goles !== undefined && <span className="fila-goles">{goles}</span>}
    </span>
  )
}

function Nota({ partido, tiempoExtra }: { partido: Partido; tiempoExtra: boolean }) {
  const { equipo } = useTorneo()
  const notas: string[] = []
  if (partido.administrativo) {
    notas.push(`${equipo(partido.administrativo.responsableId).nombre}: ${partido.administrativo.motivo}`)
  }
  if (partido.estado === 'aplazado') notas.push('Se reprogramará; conserva su jornada')
  if (partido.estado === 'revision') notas.push('El administrador está revisando el resultado')
  if (tiempoExtra || partido.penales) notas.push('Con tiempo extra')
  if (partido.penales) notas.push(`Penales ${partido.penales.local}-${partido.penales.visitante}`)
  if (!notas.length) return null
  return <span className="partido-nota">{notas.join(' · ')}</span>
}

function DetallePartido({ partido }: { partido: Partido }) {
  const { equipo } = useTorneo()
  if (partido.estado === 'administrativo') {
    return (
      <p className="partido-detalle partido-detalle-texto">
        Resultado administrativo: gana 2-0 el rival del equipo responsable. Estos goles no se le cuentan a ningún jugador.
      </p>
    )
  }
  return (
    <div className="partido-detalle">
      {[partido.localId, partido.visitanteId].map((id) => (
        <div key={id}>
          <p className="detalle-equipo">{equipo(id).nombre}</p>
          <ListaEventos eventos={partido.eventos.filter((e) => e.equipoId === id)} />
        </div>
      ))}
    </div>
  )
}

const ORDEN: Record<Evento['tipo'], number> = { gol: 0, amarilla: 1, roja: 2 }

function ListaEventos({ eventos }: { eventos: Evento[] }) {
  const { jugador } = useTorneo()
  const nombre = (id?: string) => (id && jugador(id)?.nombre) || 'Jugador'
  if (!eventos.length) return <p className="texto-suave">Sin goles ni tarjetas</p>
  return (
    <ul className="eventos">
      {[...eventos]
        .sort((a, b) => ORDEN[a.tipo] - ORDEN[b.tipo])
        .map((e, i) =>
          e.tipo === 'gol' ? (
            <li key={i}>
              <span className="icono-gol" aria-hidden="true">
                ⚽
              </span>
              <span>
                {e.autogol ? 'Autogol a favor' : nombre(e.jugadorId)}
                {e.tiempoExtra && ' (tiempo extra)'}
                {e.asistenciaId && <span className="sub">Asistencia: {nombre(e.asistenciaId)}</span>}
              </span>
            </li>
          ) : (
            <li key={i}>
              <span
                className={`icono-tarjeta icono-${e.tipo}`}
                role="img"
                aria-label={e.tipo === 'amarilla' ? 'Tarjeta amarilla' : 'Tarjeta roja'}
              />
              <span>
                {nombre(e.jugadorId)}
                {e.tipo === 'roja' && e.dobleAmarilla && <span className="sub">Por doble amarilla</span>}
              </span>
            </li>
          ),
        )}
    </ul>
  )
}
