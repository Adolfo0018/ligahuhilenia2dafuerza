import { useState } from 'react'
import { Escudo } from '../components/Escudo'
import { useTorneo } from '../lib/contexto'
import {
  asignarEquipo,
  borrarSolicitudes,
  eventosDeCapturas,
  quitarAcceso,
  rechazarCuenta,
  rechazarSolicitud,
  useCapturas,
  useSolicitudes,
  useUsuarios,
  venceCaptura,
  yaSeJugo,
} from '../lib/delegados'
import { fechaCorta, POSICIONES } from '../lib/formato'
import { estaPublicado } from '../lib/partidos'
import { modificarTorneo } from '../lib/repositorio'
import type { Captura, Partido, Solicitud, Torneo, Usuario } from '../types'
import { CapturaResultado } from './CapturaResultado'
import { inscritoEnOtro } from './listin'
import { ErrorValidacion, useGuardado } from './useGuardado'
import { normalizar, nuevoId } from './utilidades'

/** Lo que espera una acción del administrador; el panel lo cuenta en la pestaña "Pendientes". */
export function usePendientes(torneo: Torneo) {
  const usuarios = useUsuarios()
  const capturas = useCapturas(torneo.id)
  const solicitudes = useSolicitudes(torneo.id)
  const cuentas = (usuarios ?? []).filter((u) => u.rol === 'pendiente')
  const altas = (solicitudes ?? []).filter((s) => s.estado === 'pendiente')
  const partidos = torneo.partidos.filter((p) => !estaPublicado(p) && yaSeJugo(p))
  const capturasDe = (p: Partido) => (capturas ?? []).filter((c) => c.partidoId === p.id)
  const porRevisar = partidos.filter((p) => capturasDe(p).length > 0)
  // RF-022: venció el plazo y falta la captura de al menos un delegado.
  const vencidos = partidos.filter((p) => (venceCaptura(p, torneo) ?? Infinity) < Date.now() && capturasDe(p).length < 2)
  return {
    usuarios: usuarios ?? [],
    capturas: capturas ?? [],
    cuentas,
    altas,
    porRevisar,
    vencidos,
    capturasDe,
    total: cuentas.length + altas.length + porRevisar.length + vencidos.filter((p) => capturasDe(p).length === 0).length,
  }
}

export function SeccionPendientes() {
  const { torneo } = useTorneo()
  const pendientes = usePendientes(torneo)
  const nada = !pendientes.cuentas.length && !pendientes.altas.length && !pendientes.porRevisar.length && !pendientes.vencidos.length
  return (
    <>
      {nada && <p className="vacio">No hay nada pendiente. Aquí aparecen las cuentas nuevas de delegados, las altas y bajas de jugadores y las capturas por revisar.</p>}
      {pendientes.porRevisar.length > 0 && (
        <section className="bloque">
          <h2 className="titulo-seccion">
            Capturas por revisar <small>publica el resultado cuando estén bien</small>
          </h2>
          <div className="lista-admin">
            {pendientes.porRevisar.map((p) => (
              <RevisionPartido key={p.id} partido={p} capturas={pendientes.capturasDe(p)} />
            ))}
          </div>
        </section>
      )}
      {pendientes.vencidos.length > 0 && (
        <section className="bloque">
          <h2 className="titulo-seccion">
            Plazo de captura vencido <small>{torneo.plazoCapturaHoras ?? 24} horas después del partido</small>
          </h2>
          <div className="lista-admin">
            {pendientes.vencidos.map((p) => (
              <AlertaPlazo key={p.id} partido={p} capturas={pendientes.capturasDe(p)} />
            ))}
          </div>
        </section>
      )}
      {pendientes.altas.length > 0 && <SolicitudesJugadores solicitudes={pendientes.altas} />}
      {pendientes.cuentas.length > 0 && (
        <section className="bloque">
          <h2 className="titulo-seccion">Cuentas nuevas de delegados</h2>
          <div className="lista-admin">
            {pendientes.cuentas.map((u) => (
              <CuentaPendiente key={u.uid} usuario={u} />
            ))}
          </div>
        </section>
      )}
      <Delegados usuarios={pendientes.usuarios} />
    </>
  )
}

function RevisionPartido({ partido, capturas }: { partido: Partido; capturas: Captura[] }) {
  const { equipo } = useTorneo()
  const [revisando, setRevisando] = useState(false)
  if (revisando) {
    return (
      <CapturaResultado
        partido={partido}
        eventosIniciales={eventosDeCapturas(capturas)}
        capturas={capturas.map((c) => c.id)}
        onListo={() => setRevisando(false)}
      />
    )
  }
  return (
    <div className="tarjeta tarjeta-partido-admin">
      <div className="partido-meta">
        <span className="partido-cuando">
          J{partido.jornada} · {fechaCorta(partido.fecha)}
        </span>
      </div>
      {[partido.localId, partido.visitanteId].map((id) => {
        const captura = capturas.find((c) => c.equipoId === id)
        return (
          <span key={id} className="fila-equipo">
            <Escudo equipo={equipo(id)} />
            <span className="fila-nombre">{equipo(id).nombre}</span>
            <span className={captura ? 'estado-captura listo' : 'estado-captura'}>
              {captura ? `${captura.eventos.filter((e) => e.tipo === 'gol').length} goles capturados` : 'Sin captura'}
            </span>
          </span>
        )
      })}
      <div className="acciones">
        <button type="button" className="boton boton-chico" onClick={() => setRevisando(true)}>
          Revisar y publicar
        </button>
      </div>
    </div>
  )
}

function AlertaPlazo({ partido, capturas }: { partido: Partido; capturas: Captura[] }) {
  const { torneo, equipo } = useTorneo()
  const faltan = [partido.localId, partido.visitanteId].filter((id) => !capturas.some((c) => c.equipoId === id))
  const [sancionando, setSancionando] = useState<string | null>(null)
  const [descripcion, setDescripcion] = useState('')
  const { guardar, guardando, aviso } = useGuardado()

  async function sancionar() {
    if (!sancionando || !descripcion.trim()) return
    const ok = await guardar(
      () =>
        modificarTorneo(torneo.id, (t) => ({
          sanciones: [...t.sanciones, { equipoId: sancionando, descripcion: descripcion.trim(), fecha: new Date().toISOString().slice(0, 10) }],
        })),
      'Sanción registrada; se ve en Estadísticas',
    )
    if (ok) setSancionando(null)
  }

  return (
    <div className="tarjeta tarjeta-partido-admin">
      <div className="partido-meta">
        <span className="partido-cuando">
          J{partido.jornada} · {fechaCorta(partido.fecha)} · {equipo(partido.localId).nombre} vs {equipo(partido.visitanteId).nombre}
        </span>
        <span className="insignia insignia-aplazado">Plazo vencido</span>
      </div>
      {faltan.map((id) => (
        <div key={id} className="fila-admin">
          <Escudo equipo={equipo(id)} chico />
          <span className="fila-admin-texto">
            <strong>{equipo(id).nombre}</strong>
            <span>No ha capturado</span>
          </span>
          <button
            type="button"
            className="boton-enlace"
            onClick={() => {
              setSancionando(id)
              setDescripcion(`Captura tardía de la jornada ${partido.jornada}`)
            }}
          >
            Registrar sanción
          </button>
        </div>
      ))}
      {sancionando && (
        <div className="campos">
          <label className="campo">
            <span>Sanción para {equipo(sancionando).nombre} (opcional; no cambia la tabla)</span>
            <input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} maxLength={120} />
          </label>
          <div className="acciones">
            <button type="button" className="boton boton-chico" onClick={sancionar} disabled={guardando}>
              Registrar
            </button>
            <button type="button" className="boton boton-chico boton-secundario" onClick={() => setSancionando(null)}>
              Cancelar
            </button>
          </div>
        </div>
      )}
      {aviso}
      <p className="nota">Puedes capturar el resultado tú mismo en “Partidos”.</p>
    </div>
  )
}

/** Aplica al torneo las solicitudes aprobadas; las que ya no son válidas se reportan sin cambiar nada. */
function aplicarSolicitudes(t: Torneo, solicitudes: Solicitud[]) {
  let jugadores = [...t.jugadores]
  for (const s of solicitudes) {
    if (s.tipo === 'alta' && s.datos) {
      const otro = inscritoEnOtro({ ...t, jugadores }, s.equipoId, s.datos.nombre)
      if (otro) throw new ErrorValidacion(`${s.datos.nombre} ya está inscrito en ${otro}.`)
      if (jugadores.some((j) => j.equipoId === s.equipoId && normalizar(j.nombre) === normalizar(s.datos!.nombre))) continue
      jugadores.push({ id: nuevoId(s.equipoId), equipoId: s.equipoId, ...s.datos })
    } else if (s.tipo === 'baja' && s.jugadorId) {
      const conEventos = t.partidos.some((p) =>
        p.eventos.some((e) => ('jugadorId' in e && e.jugadorId === s.jugadorId) || (e.tipo === 'gol' && e.asistenciaId === s.jugadorId)),
      )
      const nombre = t.jugadores.find((j) => j.id === s.jugadorId)?.nombre ?? 'El jugador'
      if (conEventos) throw new ErrorValidacion(`${nombre} tiene goles o tarjetas registrados; rechaza la baja.`)
      jugadores = jugadores.filter((j) => j.id !== s.jugadorId)
    }
  }
  return { jugadores }
}

function SolicitudesJugadores({ solicitudes }: { solicitudes: Solicitud[] }) {
  const { torneo, equipo, jugador } = useTorneo()
  const { guardar, guardando, aviso } = useGuardado()
  const porEquipo = new Map<string, Solicitud[]>()
  for (const s of solicitudes) porEquipo.set(s.equipoId, [...(porEquipo.get(s.equipoId) ?? []), s])

  async function aprobar(lista: Solicitud[]) {
    await guardar(async () => {
      await modificarTorneo(torneo.id, (t) => aplicarSolicitudes(t, lista))
      await borrarSolicitudes(lista.map((s) => s.id))
    }, lista.length === 1 ? 'Solicitud aprobada' : `${lista.length} solicitudes aprobadas`)
  }

  return (
    <section className="bloque">
      <h2 className="titulo-seccion">
        Altas y bajas de jugadores <small>pedidas por los delegados</small>
      </h2>
      {aviso}
      {[...porEquipo].map(([equipoId, lista]) => (
        <div key={equipoId} className="tarjeta tarjeta-equipo">
          <div className="fila-admin">
            <Escudo equipo={equipo(equipoId)} />
            <span className="fila-admin-texto">
              <strong>{equipo(equipoId).nombre}</strong>
              <span>{lista.length === 1 ? '1 solicitud' : `${lista.length} solicitudes`}</span>
            </span>
            <button type="button" className="boton boton-chico" onClick={() => aprobar(lista)} disabled={guardando}>
              Aprobar todas
            </button>
          </div>
          <ul className="lista-jugadores">
            {lista.map((s) => (
              <li key={s.id}>
                <div className="fila-jugador">
                  <span className="numero">{s.tipo === 'alta' ? (s.datos?.numero ?? '+') : '−'}</span>
                  <span className="fila-jugador-nombre">
                    {s.tipo === 'alta' ? s.datos?.nombre : (jugador(s.jugadorId ?? '')?.nombre ?? 'Jugador')}
                    <span className="fila-jugador-posicion">
                      {s.tipo === 'alta'
                        ? ['Alta', s.datos?.posicion && POSICIONES[s.datos.posicion], s.datos?.menor && 'Menor de edad'].filter(Boolean).join(' · ')
                        : 'Baja'}
                    </span>
                  </span>
                  <button type="button" className="boton-enlace" onClick={() => aprobar([s])} disabled={guardando}>
                    Aprobar
                  </button>
                  <button
                    type="button"
                    className="boton-enlace boton-peligro-texto"
                    onClick={() => guardar(() => rechazarSolicitud(s.id), 'Solicitud rechazada')}
                    disabled={guardando}
                  >
                    Rechazar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  )
}

function CuentaPendiente({ usuario }: { usuario: Usuario }) {
  const { torneo } = useTorneo()
  const equipos = [...torneo.equipos].sort((a, b) => a.nombre.localeCompare(b.nombre))
  const sugerido = equipos.find((e) => e.nombre === usuario.equipoSolicitado)?.id ?? ''
  const [equipoId, setEquipoId] = useState(sugerido)
  const { guardar, fallar, guardando, aviso } = useGuardado()

  function asignar() {
    const eq = equipos.find((e) => e.id === equipoId)
    if (!eq) return fallar('Elige el equipo.')
    guardar(() => asignarEquipo(usuario.uid, eq.id, eq.nombre), `${usuario.nombre ?? usuario.correo} ya es delegado de ${eq.nombre}`)
  }

  return (
    <div className="tarjeta formulario">
      <div className="fila-admin-texto">
        <strong>{usuario.nombre ?? 'Sin nombre'}</strong>
        <span>
          {usuario.correo} · pidió {usuario.equipoSolicitado || 'sin equipo'}
        </span>
      </div>
      <label className="campo">
        <span>Equipo que representa</span>
        <select value={equipoId} onChange={(e) => setEquipoId(e.target.value)}>
          <option value="">Elige el equipo</option>
          {equipos.map((e) => (
            <option key={e.id} value={e.id}>
              {e.nombre}
            </option>
          ))}
        </select>
      </label>
      {aviso}
      <div className="acciones">
        <button type="button" className="boton boton-chico" onClick={asignar} disabled={guardando}>
          Dar acceso
        </button>
        <button
          type="button"
          className="boton boton-chico boton-peligro-texto"
          onClick={() => {
            if (window.confirm(`¿Rechazar la cuenta de ${usuario.correo}?`)) guardar(() => rechazarCuenta(usuario.uid), 'Cuenta rechazada')
          }}
          disabled={guardando}
        >
          Rechazar
        </button>
      </div>
    </div>
  )
}

function Delegados({ usuarios }: { usuarios: Usuario[] }) {
  const { torneo } = useTorneo()
  const { guardar, aviso } = useGuardado()
  const delegados = usuarios.filter((u) => u.rol === 'delegado').sort((a, b) => (a.equipoNombre ?? '').localeCompare(b.equipoNombre ?? ''))
  const sinDelegado = torneo.equipos.filter((e) => !delegados.some((d) => d.equipoId === e.id))
  return (
    <section className="bloque">
      <h2 className="titulo-seccion">
        Delegados <small>{delegados.length} de {torneo.equipos.length} equipos</small>
      </h2>
      {aviso}
      {delegados.length ? (
        <div className="tarjeta">
          <ul className="ranking">
            {delegados.map((d) => (
              <li key={d.uid}>
                <span />
                <span />
                <span className="ranking-quien">
                  <strong>{d.equipoNombre}</strong>
                  <span>
                    {d.nombre} · {d.correo}
                  </span>
                </span>
                <button
                  type="button"
                  className="boton-enlace boton-peligro-texto"
                  onClick={() => {
                    if (window.confirm(`¿Quitarle el acceso a ${d.nombre ?? d.correo}?`)) guardar(() => quitarAcceso(d.uid), 'Acceso quitado')
                  }}
                >
                  Quitar acceso
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="vacio">Todavía no hay delegados. Cada uno se registra en esta misma página con “Soy delegado: crear cuenta”.</p>
      )}
      {delegados.length > 0 && sinDelegado.length > 0 && (
        <p className="nota">Sin delegado: {sinDelegado.map((e) => e.nombre).join(', ')}.</p>
      )}
    </section>
  )
}
