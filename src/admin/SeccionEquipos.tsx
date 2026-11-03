import { useState, type FormEvent } from 'react'
import { Escudo } from '../components/Escudo'
import { useTorneo } from '../lib/contexto'
import { LUGARES_CUERPO_TECNICO, POSICIONES, porNumero, ROLES_CUERPO_TECNICO } from '../lib/formato'
import { juegaEn } from '../lib/partidos'
import { modificarTorneo } from '../lib/repositorio'
import type { Equipo, Jugador, Posicion } from '../types'
import { inscritoEnOtro, leerLista } from './listin'
import { useGuardado } from './useGuardado'
import { abreviar, COLORES_EQUIPO, normalizar, nuevoId } from './utilidades'

export function SeccionEquipos() {
  const { torneo } = useTorneo()
  const [agregando, setAgregando] = useState(false)
  const [abierto, setAbierto] = useState<string | null>(null)
  const equipos = [...torneo.equipos].sort((a, b) => a.nombre.localeCompare(b.nombre))

  return (
    <>
      <div className="admin-titulo">
        <h2 className="titulo-seccion">
          Equipos <small>{equipos.length === 1 ? '1 inscrito' : `${equipos.length} inscritos`}</small>
        </h2>
        {!agregando && (
          <button type="button" className="boton" onClick={() => setAgregando(true)}>
            + Agregar equipo
          </button>
        )}
      </div>
      {agregando && <FormEquipo onListo={() => setAgregando(false)} />}
      {equipos.length ? (
        <div className="lista-admin">
          {equipos.map((e) => (
            <TarjetaEquipo
              key={e.id}
              equipo={e}
              abierto={abierto === e.id}
              onAlternar={() => setAbierto(abierto === e.id ? null : e.id)}
            />
          ))}
        </div>
      ) : (
        !agregando && <p className="vacio">Todavía no hay equipos inscritos en este torneo.</p>
      )}
    </>
  )
}

function FormEquipo({ equipo, onListo }: { equipo?: Equipo; onListo: () => void }) {
  const { torneo } = useTorneo()
  const [nombre, setNombre] = useState(equipo?.nombre ?? '')
  const [corto, setCorto] = useState(equipo?.corto ?? '')
  const [cortoEditado, setCortoEditado] = useState(!!equipo)
  const [color, setColor] = useState(equipo?.color ?? COLORES_EQUIPO[torneo.equipos.length % COLORES_EQUIPO.length])
  const { guardar, fallar, guardando, aviso } = useGuardado()
  const abreviatura = cortoEditado ? corto : abreviar(nombre)
  const vista: Equipo = { id: 'vista', nombre: nombre || 'Equipo', corto: abreviatura || '?', color }

  async function enviar(e: FormEvent) {
    e.preventDefault()
    const limpio = nombre.trim()
    if (!limpio) return fallar('Escribe el nombre del equipo.')
    if (!abreviatura.trim()) return fallar('Escribe la abreviatura del escudo.')
    const repetido = torneo.equipos.find((o) => o.id !== equipo?.id && normalizar(o.nombre) === normalizar(limpio))
    if (repetido) return fallar(`Ya hay un equipo llamado ${repetido.nombre} en este torneo.`)
    const datos = { nombre: limpio, corto: abreviatura.trim().toUpperCase(), color }
    const ok = await guardar(
      () =>
        modificarTorneo(torneo.id, (t) => ({
          equipos: equipo
            ? t.equipos.map((o) => (o.id === equipo.id ? { ...o, ...datos } : o))
            : [...t.equipos, { id: nuevoId('eq'), ...datos }],
        })),
      equipo ? 'Equipo actualizado' : 'Equipo agregado',
    )
    if (ok) onListo()
  }

  return (
    <form className="tarjeta formulario" onSubmit={enviar}>
      <h3 className="formulario-titulo">{equipo ? 'Editar equipo' : 'Nuevo equipo'}</h3>
      <div className="campos">
        <label className="campo">
          <span>Nombre</span>
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={40} required autoFocus />
        </label>
        <label className="campo campo-corto">
          <span>Abreviatura</span>
          <input
            value={abreviatura}
            onChange={(e) => {
              setCorto(e.target.value.toUpperCase())
              setCortoEditado(true)
            }}
            maxLength={3}
            required
          />
        </label>
        <label className="campo campo-corto">
          <span>Color</span>
          <span className="campo-color">
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
            <Escudo equipo={vista} />
          </span>
        </label>
      </div>
      {aviso}
      <div className="acciones">
        <button type="submit" className="boton" disabled={guardando}>
          {equipo ? 'Guardar' : 'Agregar equipo'}
        </button>
        <button type="button" className="boton boton-secundario" onClick={onListo}>
          Cancelar
        </button>
      </div>
    </form>
  )
}

function TarjetaEquipo({ equipo, abierto, onAlternar }: { equipo: Equipo; abierto: boolean; onAlternar: () => void }) {
  const { torneo } = useTorneo()
  const [editando, setEditando] = useState(false)
  const { guardar, fallar, aviso } = useGuardado()
  const jugadores = torneo.jugadores.filter((j) => j.equipoId === equipo.id)

  function borrar() {
    if (torneo.partidos.some((p) => juegaEn(p, equipo.id))) {
      return fallar('Este equipo ya tiene partidos. Bórralos primero en “Partidos”.')
    }
    if (!window.confirm(`¿Borrar ${equipo.nombre} y sus ${jugadores.length} jugadores de este torneo?`)) return
    guardar(
      () =>
        modificarTorneo(torneo.id, (t) => ({
          equipos: t.equipos.filter((e) => e.id !== equipo.id),
          jugadores: t.jugadores.filter((j) => j.equipoId !== equipo.id),
        })),
      'Equipo borrado',
    )
  }

  if (editando) return <FormEquipo equipo={equipo} onListo={() => setEditando(false)} />

  return (
    <div className="tarjeta tarjeta-equipo">
      <div className="fila-admin">
        <Escudo equipo={equipo} />
        <div className="fila-admin-texto">
          <strong>{equipo.nombre}</strong>
          <span>
            {jugadores.length === 1 ? '1 jugador' : `${jugadores.length} jugadores`}
            {equipo.cuerpoTecnico?.length ? ` · ${equipo.cuerpoTecnico.length} en el cuerpo técnico` : ''}
          </span>
        </div>
        <div className="acciones acciones-fila">
          <button type="button" className="boton boton-chico" aria-expanded={abierto} onClick={onAlternar}>
            {abierto ? 'Cerrar plantel' : 'Plantel'}
          </button>
          <button type="button" className="boton boton-chico boton-secundario" onClick={() => setEditando(true)}>
            Editar
          </button>
          <button type="button" className="boton boton-chico boton-peligro-texto" onClick={borrar}>
            Borrar
          </button>
        </div>
      </div>
      {aviso}
      {abierto && <Plantel equipo={equipo} jugadores={jugadores} />}
    </div>
  )
}

function Plantel({ equipo, jugadores }: { equipo: Equipo; jugadores: Jugador[] }) {
  const [editando, setEditando] = useState<string | null>(null)
  const [pegando, setPegando] = useState(false)
  const ordenados = [...jugadores].sort(porNumero)
  return (
    <div className="plantel">
      <CuerpoTecnico equipo={equipo} />
      <p className="captura-subtitulo">Jugadores</p>
      {ordenados.length ? (
        <ul className="lista-jugadores">
          {ordenados.map((j) =>
            editando === j.id ? (
              <li key={j.id}>
                <FormJugador equipo={equipo} jugador={j} onListo={() => setEditando(null)} />
              </li>
            ) : (
              <FilaJugador key={j.id} jugador={j} onEditar={() => setEditando(j.id)} />
            ),
          )}
        </ul>
      ) : (
        <p className="nota">Sin jugadores todavía.</p>
      )}
      {pegando ? (
        <PegarLista equipo={equipo} onListo={() => setPegando(false)} />
      ) : (
        <>
          <FormJugador equipo={equipo} />
          <button type="button" className="boton boton-chico boton-secundario" onClick={() => setPegando(true)}>
            Pegar lista de jugadores
          </button>
        </>
      )}
    </div>
  )
}

function CuerpoTecnico({ equipo }: { equipo: Equipo }) {
  const [editando, setEditando] = useState(false)
  const miembros = equipo.cuerpoTecnico ?? []
  if (editando) return <FormCuerpoTecnico equipo={equipo} onListo={() => setEditando(false)} />
  return (
    <div className="cuerpo-tecnico">
      <div className="admin-titulo">
        <p className="captura-subtitulo">Cuerpo técnico</p>
        <button type="button" className="boton-enlace" onClick={() => setEditando(true)}>
          {miembros.length ? 'Editar' : 'Agregar'}
        </button>
      </div>
      {miembros.length ? (
        <ul className="lista-cuerpo">
          {miembros.map((m, i) => (
            <li key={i}>
              <span>{ROLES_CUERPO_TECNICO[m.rol]}</span>
              {m.nombre}
            </li>
          ))}
        </ul>
      ) : (
        <p className="nota">Sin cuerpo técnico registrado.</p>
      )}
    </div>
  )
}

function FormCuerpoTecnico({ equipo, onListo }: { equipo: Equipo; onListo: () => void }) {
  const { torneo } = useTorneo()
  // Un campo por cada lugar del listín; si hay más miembros registrados (por ejemplo, un tercer auxiliar), se agregan al final.
  const [lugares] = useState(() => {
    const restantes = [...(equipo.cuerpoTecnico ?? [])]
    const base = LUGARES_CUERPO_TECNICO.map((rol) => {
      const i = restantes.findIndex((m) => m.rol === rol)
      return { rol, nombre: i >= 0 ? restantes.splice(i, 1)[0].nombre : '' }
    })
    return [...base, ...restantes]
  })
  const [nombres, setNombres] = useState(lugares.map((l) => l.nombre))
  const { guardar, guardando, aviso } = useGuardado()

  async function enviar(e: FormEvent) {
    e.preventDefault()
    const cuerpoTecnico = lugares.map((l, i) => ({ rol: l.rol, nombre: nombres[i].trim() })).filter((m) => m.nombre)
    const ok = await guardar(
      () =>
        modificarTorneo(torneo.id, (t) => ({
          equipos: t.equipos.map((eq) => (eq.id === equipo.id ? { ...eq, cuerpoTecnico: cuerpoTecnico.length ? cuerpoTecnico : undefined } : eq)),
        })),
      'Cuerpo técnico guardado',
    )
    if (ok) onListo()
  }

  return (
    <form className="formulario formulario-cuerpo" onSubmit={enviar}>
      <p className="captura-subtitulo">Cuerpo técnico</p>
      <div className="campos">
        {lugares.map((l, i) => (
          <label key={i} className="campo">
            <span>{ROLES_CUERPO_TECNICO[l.rol]}</span>
            <input
              value={nombres[i]}
              onChange={(e) => setNombres(nombres.map((n, j) => (j === i ? e.target.value : n)))}
              maxLength={50}
              placeholder="Nombre y apellidos"
            />
          </label>
        ))}
      </div>
      {aviso}
      <div className="acciones">
        <button type="submit" className="boton boton-chico" disabled={guardando}>
          Guardar
        </button>
        <button type="button" className="boton boton-chico boton-secundario" onClick={onListo}>
          Cancelar
        </button>
      </div>
    </form>
  )
}

function FilaJugador({ jugador, onEditar }: { jugador: Jugador; onEditar: () => void }) {
  const { torneo } = useTorneo()
  const { guardar, fallar, aviso } = useGuardado()

  function borrar() {
    const tieneEventos = torneo.partidos.some((p) =>
      p.eventos.some((e) => ('jugadorId' in e && e.jugadorId === jugador.id) || (e.tipo === 'gol' && e.asistenciaId === jugador.id)),
    )
    if (tieneEventos) return fallar('Tiene goles, asistencias o tarjetas registrados; no se puede borrar.')
    if (!window.confirm(`¿Borrar a ${jugador.nombre}?`)) return
    guardar(
      () => modificarTorneo(torneo.id, (t) => ({ jugadores: t.jugadores.filter((j) => j.id !== jugador.id) })),
      'Jugador borrado',
    )
  }

  return (
    <li>
      <div className="fila-jugador">
        <span className="numero">{jugador.numero ?? '–'}</span>
        <span className="fila-jugador-nombre">
          {jugador.nombre}
          <DetalleJugador jugador={jugador} />
        </span>
        <button type="button" className="boton-enlace" onClick={onEditar}>
          Editar
        </button>
        <button type="button" className="boton-enlace boton-peligro-texto" onClick={borrar}>
          Borrar
        </button>
      </div>
      {aviso}
    </li>
  )
}

/** Posición y "Menor de edad" debajo del nombre, si los tiene. */
function DetalleJugador({ jugador }: { jugador: Pick<Jugador, 'posicion' | 'menor'> }) {
  const partes = [jugador.posicion && POSICIONES[jugador.posicion], jugador.menor && 'Menor de edad'].filter(Boolean)
  if (!partes.length) return null
  return <span className="fila-jugador-posicion">{partes.join(' · ')}</span>
}

function FormJugador({ equipo, jugador, onListo }: { equipo: Equipo; jugador?: Jugador; onListo?: () => void }) {
  const { torneo } = useTorneo()
  const [nombre, setNombre] = useState(jugador?.nombre ?? '')
  const [numero, setNumero] = useState(jugador?.numero === undefined ? '' : String(jugador.numero))
  const [posicion, setPosicion] = useState<Posicion | ''>(jugador?.posicion ?? '')
  const [menor, setMenor] = useState(jugador?.menor ?? false)
  const { guardar, fallar, guardando, aviso } = useGuardado()

  async function enviar(e: FormEvent) {
    e.preventDefault()
    const limpio = nombre.trim()
    const n = numero.trim() === '' ? undefined : Number(numero)
    if (!limpio) return fallar('Escribe el nombre del jugador.')
    if (n !== undefined && (!Number.isInteger(n) || n < 0 || n > 99)) return fallar('El número debe ser de 0 a 99.')
    const delEquipo = torneo.jugadores.filter((j) => j.id !== jugador?.id && j.equipoId === equipo.id)
    if (n !== undefined && delEquipo.some((j) => j.numero === n)) return fallar(`El número ${n} ya lo usa otro jugador del equipo.`)
    if (delEquipo.some((j) => normalizar(j.nombre) === normalizar(limpio))) return fallar(`${limpio} ya está en el plantel.`)
    const otro = inscritoEnOtro(torneo, equipo.id, limpio, jugador?.id)
    if (otro) return fallar(`${limpio} ya está inscrito en ${otro} en este torneo.`)

    const datos = { nombre: limpio, numero: n, posicion: posicion || undefined, menor: menor || undefined }
    const ok = await guardar(
      () =>
        modificarTorneo(torneo.id, (t) => ({
          jugadores: jugador
            ? // Se arma de nuevo para poder quitar el número o la posición (Firestore omite los campos vacíos).
              t.jugadores.map((j) => (j.id === jugador.id ? { id: j.id, equipoId: j.equipoId, ...datos } : j))
            : [...t.jugadores, { id: nuevoId(equipo.id), equipoId: equipo.id, ...datos }],
        })),
      jugador ? 'Jugador actualizado' : `${limpio} agregado`,
    )
    if (!ok) return
    if (onListo) onListo()
    else {
      // Para capturar el plantel de corrido: el formulario queda listo para el siguiente jugador.
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
        <span>{jugador ? 'Nombre' : 'Nuevo jugador'}</span>
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
          {jugador ? 'Guardar' : 'Agregar'}
        </button>
        {onListo && (
          <button type="button" className="boton boton-chico boton-secundario" onClick={onListo}>
            Cancelar
          </button>
        )}
      </div>
      {aviso}
    </form>
  )
}


function PegarLista({ equipo, onListo }: { equipo: Equipo; onListo: () => void }) {
  const { torneo } = useTorneo()
  const [texto, setTexto] = useState('')
  const [conNumero, setConNumero] = useState(false)
  const { guardar, fallar, guardando, aviso } = useGuardado()
  const { jugadores: renglones, cuerpo } = leerLista(texto, conNumero)
  const yaEstan = new Set(torneo.jugadores.filter((j) => j.equipoId === equipo.id).map((j) => normalizar(j.nombre)))
  const revisados = renglones.map((r) => ({
    ...r,
    problema: yaEstan.has(normalizar(r.nombre))
      ? 'Ya está en el plantel'
      : inscritoEnOtro(torneo, equipo.id, r.nombre) && `Ya está en ${inscritoEnOtro(torneo, equipo.id, r.nombre)}`,
  }))
  const nuevos = revisados.filter((r) => !r.problema)

  async function agregar() {
    if (!nuevos.length && !cuerpo.length) return fallar('No hay jugadores nuevos para agregar.')
    const ok = await guardar(
      () =>
        modificarTorneo(torneo.id, (t) => ({
          // Si la lista trae cuerpo técnico, reemplaza al registrado.
          ...(cuerpo.length && { equipos: t.equipos.map((eq) => (eq.id === equipo.id ? { ...eq, cuerpoTecnico: cuerpo } : eq)) }),
          jugadores: [
            ...t.jugadores,
            ...nuevos.map((r) => ({
              id: nuevoId(equipo.id),
              equipoId: equipo.id,
              nombre: r.nombre,
              numero: r.numero,
              posicion: r.posicion,
              menor: r.menor,
            })),
          ],
        })),
      [nuevos.length && `${nuevos.length} jugadores agregados`, cuerpo.length && 'cuerpo técnico guardado'].filter(Boolean).join(' y '),
    )
    if (ok) onListo()
  }

  const textoBoton = [
    nuevos.length && (nuevos.length === 1 ? 'Agregar 1 jugador' : `Agregar ${nuevos.length} jugadores`),
    cuerpo.length && (nuevos.length ? 'cuerpo técnico' : 'Guardar cuerpo técnico'),
  ]
    .filter(Boolean)
    .join(' y ')

  return (
    <div className="pegar-lista">
      <label className="campo">
        <span>Pega la lista: un jugador por renglón. Puedes copiar la tabla del listín tal cual; “(M)” marca a un menor de edad.</span>
        <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={8} placeholder={'Carlos Daniel Dzul Dzul\tPortero\nDavid Isaia Flores Pool\tDefensa'} />
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
              {r.problema ? <span className="fila-jugador-posicion">{r.problema}</span> : <DetalleJugador jugador={r} />}
            </li>
          ))}
        </ul>
      )}
      {cuerpo.length > 0 && (
        <div className="cuerpo-tecnico">
          <p className="captura-subtitulo">Cuerpo técnico (reemplaza al registrado)</p>
          <ul className="lista-cuerpo">
            {cuerpo.map((m, i) => (
              <li key={i}>
                <span>{ROLES_CUERPO_TECNICO[m.rol]}</span>
                {m.nombre}
              </li>
            ))}
          </ul>
        </div>
      )}
      {aviso}
      <div className="acciones">
        <button type="button" className="boton boton-chico" onClick={agregar} disabled={guardando || (!nuevos.length && !cuerpo.length)}>
          {textoBoton || 'Agregar jugadores'}
        </button>
        <button type="button" className="boton boton-chico boton-secundario" onClick={onListo}>
          Cancelar
        </button>
      </div>
    </div>
  )
}
