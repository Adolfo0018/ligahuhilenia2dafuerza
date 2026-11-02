import { useState } from 'react'
import { Escudo } from '../components/Escudo'
import { useTorneo } from '../lib/contexto'
import { etiquetaJugador, porNumero } from '../lib/formato'
import { estaPublicado, marcador } from '../lib/partidos'
import { modificarTorneo } from '../lib/repositorio'
import type { Evento, Partido } from '../types'
import { useGuardado } from './useGuardado'
import { nuevoId } from './utilidades'

/** Valor del selector de goleador que marca un autogol a favor. */
const AUTOGOL = 'autogol'

type Gol = Extract<Evento, { tipo: 'gol' }>
type Tarjeta = Extract<Evento, { tipo: 'amarilla' | 'roja' }>

/** Cada renglón lleva una clave local para que React no confunda renglones al borrar uno de en medio. */
interface Renglon<T> {
  clave: string
  evento: T
}

function conClave<T>(evento: T): Renglon<T> {
  return { clave: nuevoId('r'), evento }
}

/**
 * Dos amarillas al mismo jugador en el partido se guardan como 1 amarilla y 1 roja por doble amarilla,
 * igual que en la Liga MX (RN-014).
 */
function normalizarTarjetas(tarjetas: Tarjeta[]): Tarjeta[] {
  const resultado: Tarjeta[] = []
  const amonestados = new Set<string>()
  const conRoja = new Set(tarjetas.filter((t) => t.tipo === 'roja').map((t) => t.jugadorId))
  for (const t of tarjetas) {
    if (t.tipo === 'amarilla' && amonestados.has(t.jugadorId)) {
      if (!conRoja.has(t.jugadorId)) {
        resultado.push({ tipo: 'roja', equipoId: t.equipoId, jugadorId: t.jugadorId, dobleAmarilla: true })
        conRoja.add(t.jugadorId)
      }
      continue
    }
    if (t.tipo === 'amarilla') amonestados.add(t.jugadorId)
    resultado.push(t)
  }
  return resultado
}

export function CapturaResultado({ partido, onListo }: { partido: Partido; onListo: () => void }) {
  const { torneo } = useTorneo()
  const [goles, setGoles] = useState(() => partido.eventos.filter((e): e is Gol => e.tipo === 'gol').map(conClave))
  const [tarjetas, setTarjetas] = useState(() => partido.eventos.filter((e): e is Tarjeta => e.tipo !== 'gol').map(conClave))
  const { guardar, fallar, guardando, aviso } = useGuardado()
  const publicado = estaPublicado(partido)
  const borrador: Partido = { ...partido, estado: 'finalizado', eventos: goles.map((g) => g.evento) }
  const m = marcador(borrador)

  async function publicar() {
    if (goles.some((g) => !g.evento.jugadorId && !g.evento.autogol)) return fallar('Elige quién anotó cada gol.')
    if (tarjetas.some((t) => !t.evento.jugadorId)) return fallar('Elige a qué jugador es cada tarjeta.')
    const eventos: Evento[] = [...goles.map((g) => g.evento), ...normalizarTarjetas(tarjetas.map((t) => t.evento))]
    const ok = await guardar(
      () =>
        modificarTorneo(torneo.id, (t) => ({
          partidos: t.partidos.map((p) => (p.id === partido.id ? { ...p, estado: 'finalizado', eventos } : p)),
        })),
      'Resultado publicado',
    )
    if (ok) onListo()
  }

  async function quitar() {
    if (!window.confirm('¿Quitar el resultado? El partido vuelve a programado y sale de la tabla y las estadísticas.')) return
    const ok = await guardar(
      () =>
        modificarTorneo(torneo.id, (t) => ({
          partidos: t.partidos.map((p) => (p.id === partido.id ? { ...p, estado: 'programado', eventos: [] } : p)),
        })),
      'Resultado quitado',
    )
    if (ok) onListo()
  }

  return (
    <div className="tarjeta formulario captura">
      <h3 className="formulario-titulo">Resultado</h3>
      <div className="captura-marcador" aria-live="polite">
        <span>{m.local}</span>
        <span aria-hidden="true">–</span>
        <span>{m.visitante}</span>
      </div>
      <div className="captura-equipos">
        {[partido.localId, partido.visitanteId].map((equipoId) => (
          <ColumnaEquipo
            key={equipoId}
            equipoId={equipoId}
            goles={goles}
            tarjetas={tarjetas}
            onGoles={setGoles}
            onTarjetas={setTarjetas}
          />
        ))}
      </div>
      <p className="nota">Dos amarillas al mismo jugador se guardan como 1 amarilla y 1 roja por doble amarilla.</p>
      {aviso}
      <div className="acciones">
        <button type="button" className="boton" onClick={publicar} disabled={guardando}>
          {publicado ? 'Guardar cambios' : 'Publicar resultado'}
        </button>
        <button type="button" className="boton boton-secundario" onClick={onListo}>
          Cancelar
        </button>
        {publicado && (
          <button type="button" className="boton boton-peligro-texto" onClick={quitar} disabled={guardando}>
            Quitar resultado
          </button>
        )}
      </div>
    </div>
  )
}

interface PropsColumna {
  equipoId: string
  goles: Renglon<Gol>[]
  tarjetas: Renglon<Tarjeta>[]
  onGoles: (goles: Renglon<Gol>[]) => void
  onTarjetas: (tarjetas: Renglon<Tarjeta>[]) => void
}

function ColumnaEquipo({ equipoId, goles, tarjetas, onGoles, onTarjetas }: PropsColumna) {
  const { torneo, equipo } = useTorneo()
  const plantel = torneo.jugadores.filter((j) => j.equipoId === equipoId).sort(porNumero)
  const opciones = plantel.map((j) => (
    <option key={j.id} value={j.id}>
      {etiquetaJugador(j)}
    </option>
  ))

  const cambiarGol = (clave: string, cambio: Partial<Gol>) =>
    onGoles(goles.map((g) => (g.clave === clave ? { ...g, evento: { ...g.evento, ...cambio } } : g)))
  const cambiarTarjeta = (clave: string, evento: Tarjeta) =>
    onTarjetas(tarjetas.map((t) => (t.clave === clave ? { ...t, evento } : t)))

  return (
    <section className="captura-columna">
      <h4 className="captura-equipo">
        <Escudo equipo={equipo(equipoId)} chico />
        {equipo(equipoId).nombre}
      </h4>
      {!plantel.length && <p className="nota">Este equipo no tiene jugadores; agrégalos en “Equipos y jugadores”.</p>}

      <p className="captura-subtitulo">Goles</p>
      {goles
        .filter((g) => g.evento.equipoId === equipoId)
        .map(({ clave, evento }) => (
          <div key={clave} className="captura-renglon">
            <select
              aria-label="Anotó"
              value={evento.autogol ? AUTOGOL : (evento.jugadorId ?? '')}
              onChange={(e) =>
                cambiarGol(
                  clave,
                  e.target.value === AUTOGOL
                    ? { autogol: true, jugadorId: undefined, asistenciaId: undefined }
                    : { autogol: undefined, jugadorId: e.target.value || undefined },
                )
              }
            >
              <option value="">¿Quién anotó?</option>
              {opciones}
              <option value={AUTOGOL}>Autogol a favor</option>
            </select>
            {!evento.autogol && (
              <select
                aria-label="Asistencia"
                value={evento.asistenciaId ?? ''}
                onChange={(e) => cambiarGol(clave, { asistenciaId: e.target.value || undefined })}
              >
                <option value="">Sin asistencia</option>
                {plantel
                  .filter((j) => j.id !== evento.jugadorId)
                  .map((j) => (
                    <option key={j.id} value={j.id}>
                      {etiquetaJugador(j)}
                    </option>
                  ))}
              </select>
            )}
            <button type="button" className="boton-quitar" aria-label="Quitar gol" onClick={() => onGoles(goles.filter((g) => g.clave !== clave))}>
              ✕
            </button>
          </div>
        ))}
      <button type="button" className="boton boton-chico boton-secundario" onClick={() => onGoles([...goles, conClave<Gol>({ tipo: 'gol', equipoId })])}>
        + Gol
      </button>

      <p className="captura-subtitulo">Tarjetas</p>
      {tarjetas
        .filter((t) => t.evento.equipoId === equipoId)
        .map(({ clave, evento }) => (
          <div key={clave} className="captura-renglon">
            <select
              aria-label="Tarjeta"
              className="captura-tipo"
              value={evento.tipo}
              onChange={(e) => cambiarTarjeta(clave, { tipo: e.target.value as Tarjeta['tipo'], equipoId, jugadorId: evento.jugadorId })}
            >
              <option value="amarilla">Amarilla</option>
              <option value="roja">{evento.tipo === 'roja' && evento.dobleAmarilla ? 'Roja (doble amarilla)' : 'Roja'}</option>
            </select>
            <select
              aria-label="Jugador"
              value={evento.jugadorId}
              onChange={(e) => cambiarTarjeta(clave, { ...evento, jugadorId: e.target.value })}
            >
              <option value="">¿A quién?</option>
              {opciones}
            </select>
            <button
              type="button"
              className="boton-quitar"
              aria-label="Quitar tarjeta"
              onClick={() => onTarjetas(tarjetas.filter((t) => t.clave !== clave))}
            >
              ✕
            </button>
          </div>
        ))}
      <button
        type="button"
        className="boton boton-chico boton-secundario"
        onClick={() => onTarjetas([...tarjetas, conClave<Tarjeta>({ tipo: 'amarilla', equipoId, jugadorId: '' })])}
      >
        + Tarjeta
      </button>
    </section>
  )
}
