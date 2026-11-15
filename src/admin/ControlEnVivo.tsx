import { Escudo } from '../components/Escudo'
import { useTorneo } from '../lib/contexto'
import { cambiarEstado, guardarGoles, iniciarPartido, marcadorEnVivo, textoEnVivo, useAhora, useEnVivoDe, type EnVivo, type GolEnVivo } from '../lib/envivo'
import { etiquetaJugador, porNumero } from '../lib/formato'
import type { Partido } from '../types'
import { useGuardado } from './useGuardado'

/**
 * Marcador en vivo de un partido. Con `equipoId` (delegado) solo se editan los goles de ese equipo;
 * sin él (administrador) se editan los dos. Cualquiera de los dos puede marcar inicio, medio tiempo y final.
 */
export function ControlEnVivo({ partido, equipoId }: { partido: Partido; equipoId?: string }) {
  const { torneo } = useTorneo()
  const vivo = useEnVivoDe(partido)
  const ahora = useAhora(!!vivo && vivo.estado !== 'final')
  const { guardar, guardando, aviso } = useGuardado()
  const m = vivo ? marcadorEnVivo(vivo) : { local: 0, visitante: 0 }

  function iniciar() {
    if (!window.confirm('¿Iniciar el partido? El marcador en vivo se verá en el sitio.')) return
    guardar(() => iniciarPartido(torneo.id, partido), 'Partido iniciado')
  }
  function terminar(v: EnVivo) {
    if (!window.confirm(`¿Terminar el partido ${m.local}-${m.visitante}? El administrador revisará y publicará el resultado.`)) return
    guardar(() => cambiarEstado(v, 'final'), 'Partido terminado')
  }

  return (
    <div className={`tarjeta formulario envivo-control${vivo && vivo.estado !== 'final' ? ' envivo-activo' : ''}`}>
      <div className="envivo-cabecera">
        {vivo && vivo.estado !== 'final' && <span className="punto-vivo" aria-hidden="true" />}
        <strong>{vivo ? textoEnVivo(vivo, ahora) : 'Marcador en vivo'}</strong>
      </div>
      <div className="envivo-marcador" aria-live="polite">
        <span>{m.local}</span>
        <span aria-hidden="true">–</span>
        <span>{m.visitante}</span>
      </div>

      {vivo && (
        <div className="captura-equipos">
          {[partido.localId, partido.visitanteId].map((id) =>
            !equipoId || equipoId === id ? (
              <GolesEquipo key={id} vivo={vivo} equipoId={id} bloqueado={!!equipoId && vivo.estado === 'final'} />
            ) : null,
          )}
        </div>
      )}

      {aviso}
      <div className="acciones">
        {!vivo && (
          <button type="button" className="boton" onClick={iniciar} disabled={guardando}>
            Iniciar partido
          </button>
        )}
        {vivo?.estado === 'primer' && (
          <button type="button" className="boton boton-secundario" onClick={() => guardar(() => cambiarEstado(vivo, 'medio'), 'Medio tiempo')} disabled={guardando}>
            Medio tiempo
          </button>
        )}
        {vivo?.estado === 'medio' && (
          <button type="button" className="boton" onClick={() => guardar(() => cambiarEstado(vivo, 'segundo'), '2.º tiempo iniciado')} disabled={guardando}>
            Iniciar 2.º tiempo
          </button>
        )}
        {vivo && (vivo.estado === 'primer' || vivo.estado === 'segundo') && (
          <button type="button" className="boton boton-peligro" onClick={() => terminar(vivo)} disabled={guardando}>
            Terminar partido
          </button>
        )}
        {vivo?.estado === 'final' && !equipoId && (
          <button type="button" className="boton boton-chico boton-secundario" onClick={() => guardar(() => cambiarEstado(vivo, 'segundo'), 'Partido reabierto')} disabled={guardando}>
            Reabrir en vivo
          </button>
        )}
      </div>
      {vivo?.estado === 'final' && equipoId && (
        <p className="nota">Partido terminado. Captura las tarjetas con “Capturar”: los goles ya vienen de aquí. El administrador publica el resultado.</p>
      )}
      {!vivo && <p className="nota">Cualquiera de los dos delegados puede iniciar el partido. Cada uno suma los goles de su equipo.</p>}
    </div>
  )
}

function GolesEquipo({ vivo, equipoId, bloqueado }: { vivo: EnVivo; equipoId: string; bloqueado: boolean }) {
  const { torneo, equipo } = useTorneo()
  const { guardar, aviso } = useGuardado()
  const goles = equipoId === vivo.localId ? vivo.golesLocal : vivo.golesVisitante
  const plantel = torneo.jugadores.filter((j) => j.equipoId === equipoId).sort(porNumero)
  const escribir = (lista: GolEnVivo[], texto: string) => guardar(() => guardarGoles(vivo, equipoId, lista), texto)
  const cambiar = (i: number, cambio: GolEnVivo) => escribir(goles.map((g, k) => (k === i ? { ...g, ...cambio } : g)), 'Gol actualizado')

  return (
    <section className="captura-columna">
      <h4 className="captura-equipo">
        <Escudo equipo={equipo(equipoId)} chico />
        {equipo(equipoId).nombre}
      </h4>
      {!bloqueado && (
        <button type="button" className="boton envivo-gol" onClick={() => escribir([...goles, {}], 'Gol sumado')}>
          + Gol de {equipo(equipoId).corto}
        </button>
      )}
      {goles.map((g, i) => (
        <div key={i} className="captura-renglon">
          <select aria-label={`Gol ${i + 1}: quién anotó`} value={g.jugadorId ?? ''} disabled={bloqueado} onChange={(e) => cambiar(i, { jugadorId: e.target.value || undefined })}>
            <option value="">Gol {i + 1}: sin goleador</option>
            {plantel.map((j) => (
              <option key={j.id} value={j.id}>
                {etiquetaJugador(j)}
              </option>
            ))}
          </select>
          <select aria-label={`Gol ${i + 1}: asistencia`} value={g.asistenciaId ?? ''} disabled={bloqueado} onChange={(e) => cambiar(i, { asistenciaId: e.target.value || undefined })}>
            <option value="">Sin asistencia</option>
            {plantel
              .filter((j) => j.id !== g.jugadorId)
              .map((j) => (
                <option key={j.id} value={j.id}>
                  {etiquetaJugador(j)}
                </option>
              ))}
          </select>
          {!bloqueado && (
            <button
              type="button"
              className="boton-quitar"
              aria-label={`Quitar gol ${i + 1}`}
              onClick={() => window.confirm('¿Quitar este gol?') && escribir(goles.filter((_, k) => k !== i), 'Gol quitado')}
            >
              ✕
            </button>
          )}
        </div>
      ))}
      {aviso}
    </section>
  )
}
