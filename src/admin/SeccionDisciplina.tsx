import { useState, type FormEvent } from 'react'
import { Escudo } from '../components/Escudo'
import { useTorneo } from '../lib/contexto'
import { rojasSinSuspension } from '../lib/estadisticas'
import { fechaCorta, fechaSinHora, porNumero, etiquetaJugador, etiquetaPartido } from '../lib/formato'
import { estaPublicado, juegaEn, porFecha } from '../lib/partidos'
import { modificarTorneo } from '../lib/repositorio'
import type { Partido, Suspension, Torneo } from '../types'
import { useGuardado } from './useGuardado'

/** Una suspensión se identifica por el partido donde se originó y el jugador. */
const clave = (s: Pick<Suspension, 'partidoId' | 'jugadorId'>) => `${s.partidoId}_${s.jugadorId}`

/** Partidos que le faltan por cumplir; cuentan los partidos publicados de su equipo posteriores al de origen (RN-010). */
function faltanDe(t: Torneo, s: Suspension): number {
  const origen = t.partidos.find((p) => p.id === s.partidoId)
  const jugador = t.jugadores.find((j) => j.id === s.jugadorId)
  if (!origen || !jugador) return 0
  const cumplidos = t.partidos.filter((p) => estaPublicado(p) && p.fecha > origen.fecha && juegaEn(p, jugador.equipoId)).length
  return Math.max(0, s.partidos - cumplidos)
}

export function SeccionDisciplina() {
  const { torneo } = useTorneo()
  if (torneo.estado === 'terminado') {
    return (
      <>
        <p className="vacio">El torneo terminó; las suspensiones pendientes se eliminaron.</p>
        <Sanciones />
      </>
    )
  }
  return (
    <>
      <RojasPendientes />
      <Suspensiones />
      <Sanciones />
    </>
  )
}

function descripcionPartido(p: Partido, equipoId: string, nombre: (id: string) => string): string {
  const rival = p.localId === equipoId ? p.visitanteId : p.localId
  const cuando = etiquetaPartido(p)
  return `${cuando} vs ${nombre(rival)}${p.fecha ? ` · ${fechaCorta(p.fecha)}` : ''}`
}

function RojasPendientes() {
  const { torneo, equipo } = useTorneo()
  const rojas = rojasSinSuspension(torneo)
  const [abierta, setAbierta] = useState<string | null>(null)
  const [partidos, setPartidos] = useState('1')
  const [motivo, setMotivo] = useState('')
  const { guardar, fallar, guardando, aviso } = useGuardado()
  const nombre = (id: string) => equipo(id).nombre

  async function asignar(partidoId: string, jugadorId: string, n: number, texto: string) {
    if (!Number.isInteger(n) || n < 0 || n > 30) return fallar('Los partidos de suspensión deben ser un número de 0 a 30.')
    const ok = await guardar(
      () =>
        modificarTorneo(torneo.id, (t) => ({
          suspensiones: [
            ...t.suspensiones.filter((s) => clave(s) !== `${partidoId}_${jugadorId}`),
            { partidoId, jugadorId, partidos: n, motivo: texto.trim() || 'Tarjeta roja' },
          ],
        })),
      n ? 'Suspensión asignada' : 'Roja resuelta sin suspensión',
    )
    if (ok) setAbierta(null)
  }

  return (
    <section className="bloque">
      <h2 className="titulo-seccion">
        Rojas por resolver <small>{rojas.length ? `${rojas.length} sin suspensión asignada` : 'al día'}</small>
      </h2>
      {aviso}
      {rojas.length ? (
        <div className="lista-admin">
          {rojas.map((r) => {
            const id = `${r.partido.id}_${r.jugador.id}`
            const motivoBase = r.dobleAmarilla ? 'Doble amarilla' : 'Roja directa'
            return (
              <div key={id} className="tarjeta tarjeta-partido-admin">
                <div className="fila-admin">
                  <Escudo equipo={equipo(r.jugador.equipoId)} chico />
                  <span className="fila-admin-texto">
                    <strong>{r.jugador.nombre}</strong>
                    <span>
                      {motivoBase} · {descripcionPartido(r.partido, r.jugador.equipoId, nombre)}
                    </span>
                  </span>
                </div>
                {abierta === id ? (
                  <div className="formulario-cuerpo formulario">
                    <div className="campos">
                      <label className="campo campo-corto">
                        <span>Partidos de suspensión</span>
                        <input type="number" inputMode="numeric" min={0} max={30} value={partidos} onChange={(e) => setPartidos(e.target.value)} />
                      </label>
                      <label className="campo">
                        <span>Motivo</span>
                        <input value={motivo} onChange={(e) => setMotivo(e.target.value)} maxLength={80} placeholder={motivoBase} />
                      </label>
                    </div>
                    <div className="acciones">
                      <button
                        type="button"
                        className="boton boton-chico"
                        disabled={guardando}
                        onClick={() => asignar(r.partido.id, r.jugador.id, Number(partidos), motivo || motivoBase)}
                      >
                        Guardar
                      </button>
                      <button type="button" className="boton boton-chico boton-secundario" onClick={() => setAbierta(null)}>
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="acciones">
                    <button
                      type="button"
                      className="boton boton-chico"
                      onClick={() => {
                        setAbierta(id)
                        setPartidos('1')
                        setMotivo('')
                      }}
                    >
                      Asignar suspensión
                    </button>
                    <button
                      type="button"
                      className="boton boton-chico boton-secundario"
                      disabled={guardando}
                      onClick={() => asignar(r.partido.id, r.jugador.id, 0, `${motivoBase} (sin suspensión)`)}
                    >
                      Sin suspensión
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <p className="vacio">No hay rojas pendientes. Cuando se publique un partido con una roja, aparecerá aquí para asignarle los partidos de suspensión.</p>
      )}
    </section>
  )
}

function Suspensiones() {
  const { torneo, equipo, jugador } = useTorneo()
  const [agregando, setAgregando] = useState(false)
  const { guardar, aviso } = useGuardado()
  const nombre = (id: string) => equipo(id).nombre
  const filas = torneo.suspensiones
    .filter((s) => s.partidos > 0)
    .map((s) => ({ s, j: jugador(s.jugadorId), p: torneo.partidos.find((p) => p.id === s.partidoId), faltan: faltanDe(torneo, s) }))
    .filter((f) => f.j && f.p)
    .sort((a, b) => b.faltan - a.faltan || a.j!.nombre.localeCompare(b.j!.nombre))
  const activas = filas.filter((f) => f.faltan > 0)
  const cumplidas = filas.filter((f) => f.faltan === 0)

  function quitar(s: Suspension) {
    if (!window.confirm('¿Quitar esta suspensión? El jugador deja de aparecer como suspendido.')) return
    guardar(() => modificarTorneo(torneo.id, (t) => ({ suspensiones: t.suspensiones.filter((x) => clave(x) !== clave(s)) })), 'Suspensión quitada')
  }

  const fila = ({ s, j, p, faltan }: (typeof filas)[number]) => (
    <li key={clave(s)}>
      <Escudo equipo={equipo(j!.equipoId)} chico />
      <span className="ranking-quien">
        <strong>{j!.nombre}</strong>
        <span>
          {s.motivo} · {s.partidos === 1 ? '1 partido' : `${s.partidos} partidos`} · {descripcionPartido(p!, j!.equipoId, nombre)}
        </span>
      </span>
      <span className="ranking-texto">{faltan ? (faltan === 1 ? 'Falta 1' : `Faltan ${faltan}`) : 'Cumplida'}</span>
      <button type="button" className="boton-enlace boton-peligro-texto" onClick={() => quitar(s)}>
        Quitar
      </button>
    </li>
  )

  return (
    <section className="bloque">
      <div className="admin-titulo">
        <h2 className="titulo-seccion">
          Suspendidos <small>{activas.length ? `${activas.length} no pueden jugar la próxima jornada` : 'nadie'}</small>
        </h2>
        {!agregando && (
          <button type="button" className="boton boton-secundario" onClick={() => setAgregando(true)}>
            + Suspensión
          </button>
        )}
      </div>
      {agregando && <FormSuspension onListo={() => setAgregando(false)} />}
      {aviso}
      {activas.length > 0 && (
        <div className="tarjeta">
          <ul className="ranking ranking-admin">{activas.map(fila)}</ul>
        </div>
      )}
      {cumplidas.length > 0 && (
        <details className="tarjeta">
          <summary className="nota" style={{ padding: '10px 14px', cursor: 'pointer' }}>
            Suspensiones cumplidas ({cumplidas.length})
          </summary>
          <ul className="ranking ranking-admin">{cumplidas.map(fila)}</ul>
        </details>
      )}
      <p className="nota">
        Cada suspensión se cumple con los partidos publicados de su equipo después del partido en que se originó. Si un delegado captura a un
        jugador suspendido, la app solo avisa.
      </p>
    </section>
  )
}

function FormSuspension({ onListo }: { onListo: () => void }) {
  const { torneo, equipo } = useTorneo()
  const [equipoId, setEquipoId] = useState('')
  const [jugadorId, setJugadorId] = useState('')
  const [partidoId, setPartidoId] = useState('')
  const [partidos, setPartidos] = useState('1')
  const [motivo, setMotivo] = useState('')
  const { guardar, fallar, guardando, aviso } = useGuardado()
  const equipos = [...torneo.equipos].sort((a, b) => a.nombre.localeCompare(b.nombre))
  const plantel = torneo.jugadores.filter((j) => j.equipoId === equipoId).sort(porNumero)
  const jugados = torneo.partidos.filter((p) => estaPublicado(p) && juegaEn(p, equipoId)).sort(porFecha).reverse()
  const nombre = (id: string) => equipo(id).nombre

  async function enviar(e: FormEvent) {
    e.preventDefault()
    const n = Number(partidos)
    if (!jugadorId) return fallar('Elige al jugador.')
    if (!partidoId) return fallar('Elige el partido en que se originó.')
    if (!Number.isInteger(n) || n < 1 || n > 30) return fallar('Los partidos de suspensión deben ser un número de 1 a 30.')
    if (!motivo.trim()) return fallar('Escribe el motivo.')
    const ok = await guardar(
      () =>
        modificarTorneo(torneo.id, (t) => ({
          suspensiones: [...t.suspensiones.filter((s) => clave(s) !== `${partidoId}_${jugadorId}`), { partidoId, jugadorId, partidos: n, motivo: motivo.trim() }],
        })),
      'Suspensión asignada',
    )
    if (ok) onListo()
  }

  return (
    <form className="tarjeta formulario" onSubmit={enviar}>
      <h3 className="formulario-titulo">Nueva suspensión</h3>
      <div className="campos">
        <label className="campo">
          <span>Equipo</span>
          <select
            value={equipoId}
            onChange={(e) => {
              setEquipoId(e.target.value)
              setJugadorId('')
              const ultimo = torneo.partidos.filter((p) => estaPublicado(p) && juegaEn(p, e.target.value)).sort(porFecha).at(-1)
              setPartidoId(ultimo?.id ?? '')
            }}
          >
            <option value="">Elige equipo</option>
            {equipos.map((eq) => (
              <option key={eq.id} value={eq.id}>
                {eq.nombre}
              </option>
            ))}
          </select>
        </label>
        <label className="campo">
          <span>Jugador</span>
          <select value={jugadorId} onChange={(e) => setJugadorId(e.target.value)} disabled={!equipoId}>
            <option value="">{equipoId && !plantel.length ? 'Este equipo no tiene jugadores' : 'Elige jugador'}</option>
            {plantel.map((j) => (
              <option key={j.id} value={j.id}>
                {etiquetaJugador(j)}
              </option>
            ))}
          </select>
        </label>
        <label className="campo">
          <span>Partido en que se originó</span>
          <select value={partidoId} onChange={(e) => setPartidoId(e.target.value)} disabled={!equipoId}>
            <option value="">{equipoId && !jugados.length ? 'Sin partidos publicados' : 'Elige partido'}</option>
            {jugados.map((p) => (
              <option key={p.id} value={p.id}>
                {descripcionPartido(p, equipoId, nombre)}
              </option>
            ))}
          </select>
        </label>
        <label className="campo campo-corto">
          <span>Partidos</span>
          <input type="number" inputMode="numeric" min={1} max={30} value={partidos} onChange={(e) => setPartidos(e.target.value)} />
        </label>
        <label className="campo">
          <span>Motivo</span>
          <input value={motivo} onChange={(e) => setMotivo(e.target.value)} maxLength={80} placeholder="Ej. Agresión al árbitro" />
        </label>
      </div>
      {aviso}
      <div className="acciones">
        <button type="submit" className="boton" disabled={guardando}>
          Asignar
        </button>
        <button type="button" className="boton boton-secundario" onClick={onListo}>
          Cancelar
        </button>
      </div>
    </form>
  )
}

function Sanciones() {
  const { torneo, equipo } = useTorneo()
  const [agregando, setAgregando] = useState(false)
  const [equipoId, setEquipoId] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const { guardar, fallar, guardando, aviso } = useGuardado()
  const equipos = [...torneo.equipos].sort((a, b) => a.nombre.localeCompare(b.nombre))

  async function agregar(e: FormEvent) {
    e.preventDefault()
    if (!equipoId) return fallar('Elige el equipo.')
    if (!descripcion.trim()) return fallar('Escribe la sanción.')
    const ok = await guardar(
      () =>
        modificarTorneo(torneo.id, (t) => ({
          sanciones: [...t.sanciones, { equipoId, descripcion: descripcion.trim(), fecha: new Date().toISOString().slice(0, 10) }],
        })),
      'Sanción registrada',
    )
    if (ok) {
      setAgregando(false)
      setEquipoId('')
      setDescripcion('')
    }
  }

  function quitar(i: number) {
    if (!window.confirm('¿Quitar esta sanción? Deja de verse en el sitio.')) return
    const s = torneo.sanciones[i]
    guardar(
      () =>
        modificarTorneo(torneo.id, (t) => ({
          sanciones: t.sanciones.filter((x) => !(x.equipoId === s.equipoId && x.descripcion === s.descripcion && x.fecha === s.fecha)),
        })),
      'Sanción quitada',
    )
  }

  return (
    <section className="bloque">
      <div className="admin-titulo">
        <h2 className="titulo-seccion">
          Sanciones <small>se ven en el sitio, en Estadísticas</small>
        </h2>
        {!agregando && (
          <button type="button" className="boton boton-secundario" onClick={() => setAgregando(true)}>
            + Sanción
          </button>
        )}
      </div>
      {agregando && (
        <form className="tarjeta formulario" onSubmit={agregar}>
          <div className="campos">
            <label className="campo">
              <span>Equipo</span>
              <select value={equipoId} onChange={(e) => setEquipoId(e.target.value)}>
                <option value="">Elige equipo</option>
                {equipos.map((eq) => (
                  <option key={eq.id} value={eq.id}>
                    {eq.nombre}
                  </option>
                ))}
              </select>
            </label>
            <label className="campo">
              <span>Sanción</span>
              <input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} maxLength={120} placeholder="Ej. Multa por captura tardía, jornada 4" />
            </label>
          </div>
          <p className="nota">La sanción es informativa: no cambia la tabla ni bloquea al delegado.</p>
          <div className="acciones">
            <button type="submit" className="boton" disabled={guardando}>
              Registrar
            </button>
            <button type="button" className="boton boton-secundario" onClick={() => setAgregando(false)}>
              Cancelar
            </button>
          </div>
        </form>
      )}
      {aviso}
      {torneo.sanciones.length ? (
        <div className="tarjeta">
          <ul className="ranking ranking-admin">
            {torneo.sanciones.map((s, i) => (
              <li key={i}>
                <Escudo equipo={equipo(s.equipoId)} chico />
                <span className="ranking-quien">
                  <strong>{equipo(s.equipoId).nombre}</strong>
                  <span>
                    {s.descripcion} · {fechaSinHora(s.fecha)}
                  </span>
                </span>
                <button type="button" className="boton-enlace boton-peligro-texto" onClick={() => quitar(i)}>
                  Quitar
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        !agregando && <p className="vacio">No hay sanciones registradas.</p>
      )}
    </section>
  )
}
