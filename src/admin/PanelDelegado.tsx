import { signOut, type User } from 'firebase/auth'
import { useState, type FormEvent } from 'react'
import { Escudo } from '../components/Escudo'
import { Segmentado } from '../components/Segmentado'
import { liga } from '../data'
import { ProveedorTorneo, useTorneo } from '../lib/contexto'
import {
  borrarSolicitudes,
  guardarCaptura,
  pedirAltas,
  pedirBaja,
  useCapturas,
  useSolicitudes,
  venceCaptura,
  yaSeJugo,
} from '../lib/delegados'
import { fechaCorta, iniciales, nombreLiga, nombreTorneo, POSICIONES, porNumero } from '../lib/formato'
import { estaPublicado, juegaEn, marcador, porFecha } from '../lib/partidos'
import { auth } from '../lib/sesion'
import { useTorneos } from '../lib/torneos'
import type { Captura, DatosJugador, Equipo, Evento, Partido, Posicion, Usuario } from '../types'
import { ColumnaEquipo, conClave, normalizarTarjetas, type Gol, type Tarjeta } from './CapturaResultado'
import { inscritoEnOtro, leerLista } from './listin'
import { useGuardado } from './useGuardado'
import { normalizar } from './utilidades'

type Seccion = 'partidos' | 'plantel'

const SECCIONES: { id: Seccion; nombre: string }[] = [
  { id: 'partidos', nombre: 'Partidos' },
  { id: 'plantel', nombre: 'Plantel' },
]

export function PanelDelegado({ usuario, ficha }: { usuario: User; ficha: Usuario }) {
  const carga = useTorneos()
  const [seccion, setSeccion] = useState<Seccion>('partidos')
  // El delegado trabaja siempre en el torneo en curso.
  const torneo = carga.estado === 'listo' ? carga.torneos.find((t) => t.estado !== 'terminado') : undefined
  const equipo = torneo?.equipos.find((e) => e.id === ficha.equipoId)

  return (
    <>
      <header className="encabezado">
        <div className="encabezado-interior">
          <div className="marca">
            {liga.logo ? (
              <img className="marca-logo marca-logo-imagen" src={liga.logo} alt={`Logo de ${liga.nombre}`} />
            ) : (
              <span className="marca-logo" aria-hidden="true">
                {iniciales(liga.nombre)}
              </span>
            )}
            <div className="marca-texto">
              <p className="marca-liga">{nombreLiga(liga)}</p>
              <h1 className="marca-torneo">Delegado · {equipo?.nombre ?? ficha.equipoNombre}</h1>
            </div>
          </div>
          <div className="admin-cuenta">
            <span className="admin-correo">{usuario.email}</span>
            <a href="/">Ver sitio</a>
            <button type="button" onClick={() => auth && signOut(auth)}>
              Salir
            </button>
          </div>
        </div>
      </header>
      <main className="contenido">
        {carga.estado === 'cargando' && <p className="vacio">Cargando…</p>}
        {carga.estado === 'error' && <p className="mensaje mensaje-error">No se pudo cargar el torneo. Revisa tu conexión.</p>}
        {carga.estado === 'listo' && !torneo && <p className="vacio">No hay un torneo en curso.</p>}
        {torneo && !equipo && (
          <p className="vacio">Tu equipo no está inscrito en {nombreTorneo(torneo)}. Avísale al administrador de la liga.</p>
        )}
        {torneo && equipo && (
          <ProveedorTorneo torneo={torneo}>
            <p className="nota">{nombreTorneo(torneo)}</p>
            <Segmentado etiqueta="Sección" opciones={SECCIONES} valor={seccion} onCambiar={setSeccion} />
            <div className="admin-seccion">
              {seccion === 'partidos' ? (
                <PartidosDelegado equipo={equipo} uid={usuario.uid} />
              ) : (
                <PlantelDelegado equipo={equipo} uid={usuario.uid} />
              )}
            </div>
          </ProveedorTorneo>
        )}
      </main>
    </>
  )
}

// ---------- Partidos ----------

function PartidosDelegado({ equipo, uid }: { equipo: Equipo; uid: string }) {
  const { torneo } = useTorneo()
  const capturas = useCapturas(torneo.id, equipo.id)
  const [abierto, setAbierto] = useState<string | null>(null)
  if (!capturas) return <p className="vacio">Cargando…</p>

  const deEquipo = torneo.partidos.filter((p) => juegaEn(p, equipo.id)).sort(porFecha)
  const porCapturar = deEquipo.filter((p) => !estaPublicado(p) && yaSeJugo(p))
  const proximos = deEquipo.filter((p) => !estaPublicado(p) && !yaSeJugo(p))
  const publicados = deEquipo.filter(estaPublicado).reverse()
  const captura = (p: Partido) => capturas.find((c) => c.partidoId === p.id)

  const tarjeta = (p: Partido) =>
    abierto === p.id ? (
      <CapturaDelegado key={p.id} partido={p} equipo={equipo} uid={uid} captura={captura(p)} onListo={() => setAbierto(null)} />
    ) : (
      <TarjetaPartidoDelegado key={p.id} partido={p} captura={captura(p)} onCapturar={() => setAbierto(p.id)} />
    )

  return (
    <>
      <section className="bloque">
        <h2 className="titulo-seccion">
          Por capturar <small>partidos jugados sin resultado publicado</small>
        </h2>
        {porCapturar.length ? <div className="lista-admin">{porCapturar.map(tarjeta)}</div> : <p className="vacio">No tienes partidos pendientes de capturar.</p>}
      </section>
      {proximos.length > 0 && (
        <section className="bloque">
          <h2 className="titulo-seccion">Próximos</h2>
          <div className="lista-admin">{proximos.slice(0, 4).map((p) => <TarjetaPartidoDelegado key={p.id} partido={p} />)}</div>
        </section>
      )}
      {publicados.length > 0 && (
        <section className="bloque">
          <h2 className="titulo-seccion">Publicados</h2>
          <div className="lista-admin">{publicados.map((p) => <TarjetaPartidoDelegado key={p.id} partido={p} />)}</div>
        </section>
      )}
    </>
  )
}

function TarjetaPartidoDelegado({ partido, captura, onCapturar }: { partido: Partido; captura?: Captura; onCapturar?: () => void }) {
  const { torneo, equipo } = useTorneo()
  const publicado = estaPublicado(partido)
  const m = publicado ? marcador(partido) : null
  const vence = venceCaptura(partido, torneo)
  const vencido = !publicado && !captura && vence !== undefined && vence < Date.now()
  const estado = publicado ? 'Publicado' : captura ? 'En revisión' : yaSeJugo(partido) ? 'Falta tu captura' : 'Programado'
  return (
    <div className="tarjeta tarjeta-partido-admin">
      <div className="partido-meta">
        <span className="partido-cuando">
          J{partido.jornada} · {fechaCorta(partido.fecha)}
          {partido.cancha && ` · ${partido.cancha}`}
        </span>
        <span className={`insignia insignia-${publicado ? 'finalizado' : captura ? 'revision' : vencido ? 'aplazado' : 'programado'}`}>
          {estado}
        </span>
      </div>
      {[partido.localId, partido.visitanteId].map((id, i) => (
        <span key={id} className="fila-equipo">
          <Escudo equipo={equipo(id)} />
          <span className="fila-nombre">{equipo(id).nombre}</span>
          {m && <span className="fila-goles">{i === 0 ? m.local : m.visitante}</span>}
        </span>
      ))}
      {vencido && <p className="nota">Ya venció el plazo para capturar; todavía puedes hacerlo, pero el administrador fue avisado.</p>}
      {onCapturar && (
        <div className="acciones">
          <button type="button" className="boton boton-chico" onClick={onCapturar}>
            {captura ? 'Corregir mi captura' : 'Capturar'}
          </button>
        </div>
      )}
    </div>
  )
}

function CapturaDelegado({ partido, equipo, uid, captura, onListo }: {
  partido: Partido
  equipo: Equipo
  uid: string
  captura?: Captura
  onListo: () => void
}) {
  const { torneo } = useTorneo()
  const iniciales = captura?.eventos ?? []
  const [goles, setGoles] = useState(() => iniciales.filter((e): e is Gol => e.tipo === 'gol').map(conClave))
  const [tarjetas, setTarjetas] = useState(() => iniciales.filter((e): e is Tarjeta => e.tipo !== 'gol').map(conClave))
  const { guardar, fallar, guardando, aviso } = useGuardado()
  const rival = partido.localId === equipo.id ? partido.visitanteId : partido.localId

  async function enviar() {
    if (goles.some((g) => !g.evento.jugadorId && !g.evento.autogol)) return fallar('Elige quién anotó cada gol.')
    if (tarjetas.some((t) => !t.evento.jugadorId)) return fallar('Elige a qué jugador es cada tarjeta.')
    const eventos: Evento[] = [...goles.map((g) => g.evento), ...normalizarTarjetas(tarjetas.map((t) => t.evento))]
    const ok = await guardar(
      () => guardarCaptura({ torneoId: torneo.id, partidoId: partido.id, equipoId: equipo.id, eventos, enviadoPor: uid }),
      'Captura enviada al administrador',
    )
    if (ok) onListo()
  }

  return (
    <div className="tarjeta formulario captura">
      <h3 className="formulario-titulo">Captura de {equipo.nombre}</h3>
      <p className="nota">
        Registra solo los goles, asistencias y tarjetas de tu equipo. El delegado de {torneo.equipos.find((e) => e.id === rival)?.nombre}{' '}
        captura los suyos y el administrador publica el resultado. Un autogol del rival cuenta como “Autogol a favor”.
      </p>
      <ColumnaEquipo equipoId={equipo.id} goles={goles} tarjetas={tarjetas} onGoles={setGoles} onTarjetas={setTarjetas} />
      <p className="nota">
        Goles de tu equipo: <strong>{goles.length}</strong>. Dos amarillas al mismo jugador se guardan como 1 amarilla y 1 roja.
      </p>
      {aviso}
      <div className="acciones">
        <button type="button" className="boton" onClick={enviar} disabled={guardando}>
          Enviar captura
        </button>
        <button type="button" className="boton boton-secundario" onClick={onListo}>
          Cancelar
        </button>
      </div>
    </div>
  )
}

// ---------- Plantel ----------

function PlantelDelegado({ equipo, uid }: { equipo: Equipo; uid: string }) {
  const { torneo } = useTorneo()
  const solicitudes = useSolicitudes(torneo.id, equipo.id)
  const { guardar, aviso } = useGuardado()
  const [pegando, setPegando] = useState(false)
  const jugadores = torneo.jugadores.filter((j) => j.equipoId === equipo.id).sort(porNumero)
  const pendientes = solicitudes ?? []
  const bajaPedida = (id: string) => pendientes.some((s) => s.tipo === 'baja' && s.jugadorId === id && s.estado === 'pendiente')

  return (
    <>
      {pendientes.length > 0 && (
        <section className="bloque">
          <h2 className="titulo-seccion">
            Solicitudes <small>las revisa el administrador</small>
          </h2>
          <div className="tarjeta">
            <ul className="ranking">
              {pendientes.map((s) => {
                const nombre = s.tipo === 'alta' ? s.datos?.nombre : torneo.jugadores.find((j) => j.id === s.jugadorId)?.nombre
                return (
                  <li key={s.id}>
                    <span className="ranking-lugar">{s.tipo === 'alta' ? '+' : '−'}</span>
                    <span />
                    <span className="ranking-quien">
                      <strong>{nombre ?? 'Jugador'}</strong>
                      <span>{s.tipo === 'alta' ? 'Alta' : 'Baja'} · {s.estado === 'pendiente' ? 'pendiente' : 'rechazada'}</span>
                    </span>
                    <button type="button" className="boton-enlace" onClick={() => guardar(() => borrarSolicitudes([s.id]), 'Solicitud quitada')}>
                      {s.estado === 'pendiente' ? 'Cancelar' : 'Descartar'}
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        </section>
      )}

      <section className="bloque">
        <h2 className="titulo-seccion">
          Plantel aprobado <small>{jugadores.length === 1 ? '1 jugador' : `${jugadores.length} jugadores`}</small>
        </h2>
        {aviso}
        {jugadores.length ? (
          <div className="tarjeta">
            <ul className="lista-jugadores plantel-delegado">
              {jugadores.map((j) => (
                <li key={j.id}>
                  <div className="fila-jugador">
                    <span className="numero">{j.numero ?? '–'}</span>
                    <span className="fila-jugador-nombre">
                      {j.nombre}
                      {(j.posicion || j.menor) && (
                        <span className="fila-jugador-posicion">
                          {[j.posicion && POSICIONES[j.posicion], j.menor && 'Menor de edad'].filter(Boolean).join(' · ')}
                        </span>
                      )}
                    </span>
                    {bajaPedida(j.id) ? (
                      <span className="nota">Baja pedida</span>
                    ) : (
                      <button
                        type="button"
                        className="boton-enlace boton-peligro-texto"
                        onClick={() => {
                          if (window.confirm(`¿Pedir la baja de ${j.nombre}?`)) guardar(() => pedirBaja(torneo.id, equipo.id, uid, j.id), 'Baja pedida')
                        }}
                      >
                        Pedir baja
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="vacio">Tu equipo todavía no tiene jugadores aprobados.</p>
        )}
      </section>

      <section className="bloque">
        <h2 className="titulo-seccion">Pedir altas</h2>
        <div className="tarjeta formulario">
          {pegando ? (
            <PegarListaDelegado equipo={equipo} uid={uid} pendientes={pendientes.flatMap((s) => (s.datos ? [s.datos.nombre] : []))} onListo={() => setPegando(false)} />
          ) : (
            <>
              <AltaDelegado equipo={equipo} uid={uid} />
              <button type="button" className="boton boton-chico boton-secundario" onClick={() => setPegando(true)}>
                Pegar lista de jugadores
              </button>
            </>
          )}
        </div>
      </section>
    </>
  )
}

/** Revisa lo mismo que el administrador al aprobar: que el jugador no esté repetido ni inscrito en otro equipo. */
function problemaDeAlta(torneo: ReturnType<typeof useTorneo>['torneo'], equipo: Equipo, nombre: string, pendientes: string[]): string | undefined {
  if (torneo.jugadores.some((j) => j.equipoId === equipo.id && normalizar(j.nombre) === normalizar(nombre))) return 'Ya está en el plantel'
  if (pendientes.some((n) => normalizar(n) === normalizar(nombre))) return 'Ya está pedida'
  const otro = inscritoEnOtro(torneo, equipo.id, nombre)
  return otro && `Ya está en ${otro}`
}

function AltaDelegado({ equipo, uid }: { equipo: Equipo; uid: string }) {
  const { torneo } = useTorneo()
  const pendientesAlta = useSolicitudes(torneo.id, equipo.id)?.flatMap((s) => (s.datos ? [s.datos.nombre] : [])) ?? []
  const [nombre, setNombre] = useState('')
  const [numero, setNumero] = useState('')
  const [posicion, setPosicion] = useState<Posicion | ''>('')
  const [menor, setMenor] = useState(false)
  const { guardar, fallar, guardando, aviso } = useGuardado()

  async function enviar(e: FormEvent) {
    e.preventDefault()
    const limpio = nombre.trim()
    const n = numero.trim() === '' ? undefined : Number(numero)
    if (!limpio) return fallar('Escribe el nombre del jugador.')
    if (n !== undefined && (!Number.isInteger(n) || n < 0 || n > 99)) return fallar('El número debe ser de 0 a 99.')
    const problema = problemaDeAlta(torneo, equipo, limpio, pendientesAlta)
    if (problema) return fallar(`${limpio}: ${problema.toLowerCase()}.`)
    const datos: DatosJugador = { nombre: limpio, numero: n, posicion: posicion || undefined, menor: menor || undefined }
    const ok = await guardar(() => pedirAltas(torneo.id, equipo.id, uid, [datos]), `Alta de ${limpio} pedida`)
    if (ok) {
      setNombre('')
      setNumero('')
      setPosicion('')
      setMenor(false)
    }
  }

  return (
    <form className="form-jugador" onSubmit={enviar}>
      <label className="campo campo-numero">
        <span>Núm.</span>
        <input type="number" inputMode="numeric" min={0} max={99} value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="–" />
      </label>
      <label className="campo">
        <span>Nuevo jugador</span>
        <input value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={50} placeholder="Nombre y apellidos" required />
      </label>
      <label className="campo campo-posicion">
        <span>Posición</span>
        <select value={posicion} onChange={(e) => setPosicion(e.target.value as Posicion | '')}>
          <option value="">Sin posición</option>
          {Object.entries(POSICIONES).map(([id, texto]) => (
            <option key={id} value={id}>
              {texto}
            </option>
          ))}
        </select>
      </label>
      <label className="casilla casilla-menor">
        <input type="checkbox" checked={menor} onChange={(e) => setMenor(e.target.checked)} />
        Menor de edad
      </label>
      <div className="acciones">
        <button type="submit" className="boton boton-chico" disabled={guardando}>
          Pedir alta
        </button>
      </div>
      {aviso}
    </form>
  )
}

function PegarListaDelegado({ equipo, uid, pendientes, onListo }: { equipo: Equipo; uid: string; pendientes: string[]; onListo: () => void }) {
  const { torneo } = useTorneo()
  const [texto, setTexto] = useState('')
  const [conNumero, setConNumero] = useState(false)
  const { guardar, guardando, aviso } = useGuardado()
  const revisados = leerLista(texto, conNumero).jugadores.map((r) => ({ ...r, problema: problemaDeAlta(torneo, equipo, r.nombre, pendientes) }))
  const nuevos = revisados.filter((r) => !r.problema)

  async function enviar() {
    const datos = nuevos.map(({ problema: _problema, ...r }) => r)
    const ok = await guardar(() => pedirAltas(torneo.id, equipo.id, uid, datos), `${datos.length} altas pedidas`)
    if (ok) onListo()
  }

  return (
    <div className="pegar-lista">
      <label className="campo">
        <span>Pega tu listín: un jugador por renglón. “(M)” marca a un menor de edad. El cuerpo técnico se lo pasas al administrador.</span>
        <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={8} />
      </label>
      <label className="casilla">
        <input type="checkbox" checked={conNumero} onChange={(e) => setConNumero(e.target.checked)} />
        La lista trae el número de camiseta
      </label>
      {revisados.length > 0 && (
        <ul className="vista-lista">
          {revisados.map((r, i) => (
            <li key={i} className={r.problema ? 'con-problema' : undefined}>
              <span className="numero">{r.numero ?? '–'}</span>
              <span className="fila-jugador-nombre">{r.nombre}</span>
              <span className="fila-jugador-posicion">
                {r.problema || [r.posicion && POSICIONES[r.posicion], r.menor && 'Menor de edad'].filter(Boolean).join(' · ')}
              </span>
            </li>
          ))}
        </ul>
      )}
      {aviso}
      <div className="acciones">
        <button type="button" className="boton boton-chico" onClick={enviar} disabled={guardando || !nuevos.length}>
          {nuevos.length === 1 ? 'Pedir 1 alta' : `Pedir ${nuevos.length} altas`}
        </button>
        <button type="button" className="boton boton-chico boton-secundario" onClick={onListo}>
          Cancelar
        </button>
      </div>
    </div>
  )
}
