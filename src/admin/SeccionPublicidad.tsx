import { useState } from 'react'
import { AnunciosRegulares, LogoAnuncio, PatrocinadorOficial } from '../components/Publicidad'
import { useTorneo } from '../lib/contexto'
import { fechaSinHora } from '../lib/formato'
import { RONDAS } from '../lib/liguilla'
import { jornadaActual } from '../lib/partidos'
import {
  anunciosDe,
  borrarAnuncio,
  cambiarEstadoAnuncio,
  enlaceSeguro,
  espacioDe,
  espacioJornada,
  esLiguilla,
  guardarAnuncio,
  hoyLocal,
  LOGOS,
  moverAnuncio,
  nombreEspacio,
  partidosDeEspacio,
  ubicacion,
  useCobros,
  vigencia,
  type Espacio,
} from '../lib/publicidad'
import type { Anuncio, Cobro, TipoAnuncio, Torneo } from '../types'
import { ErrorValidacion, useGuardado } from './useGuardado'
import { nuevoId } from './utilidades'

const ESTADOS: Record<Anuncio['estado'], string> = { borrador: 'Borrador', publicado: 'Publicado', retirado: 'Retirado' }
const VIGENCIAS = { vigente: 'Vigente', programado: 'Programado', vencido: 'Vencido' }
const pesos = (n: number) => n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 2 })

/** Días con partido de la jornada o ronda (en liguilla, ida y vuelta), para proponer la vigencia. */
function vigenciaSugerida(t: Torneo, espacio: Espacio) {
  const hoy = hoyLocal()
  const dias = partidosDeEspacio(t, espacio).filter((p) => p.fecha).map((p) => p.fecha.slice(0, 10)).sort()
  const ultimo = dias.at(-1)
  if (ultimo && ultimo >= hoy) return { inicio: hoy, fin: ultimo }
  const margen = esLiguilla(espacio) ? 14 : 7
  return { inicio: hoy, fin: new Date(Date.now() + margen * 86400000).toLocaleDateString('sv-SE') }
}

/** Al abrir: la ronda de liguilla más avanzada que ya tenga partidos, o la jornada actual. */
function espacioInicial(t: Torneo): Espacio {
  const ronda = [...RONDAS].reverse().find((r) => t.partidos.some((p) => p.ronda === r.id))
  return t.estado !== 'regular' && ronda ? ronda.id : espacioJornada(jornadaActual(t))
}

/** Jornadas de fase regular y rondas de liguilla. Las rondas se pueden vender aunque la liguilla aún no se genere. */
function SelectorEspacio({ valor, onCambiar, etiqueta = 'Jornada o ronda' }: { valor: Espacio; onCambiar: (e: Espacio) => void; etiqueta?: string }) {
  const { torneo } = useTorneo()
  const total = Math.max(1, ...torneo.partidos.filter((p) => p.fase === 'regular').map((p) => p.jornada ?? 1))
  return (
    <label className="campo">
      <span>{etiqueta}</span>
      <select value={valor} onChange={(e) => onCambiar(e.target.value)}>
        <optgroup label="Fase regular">
          {Array.from({ length: total }, (_, i) => espacioJornada(i + 1)).map((e) => (
            <option key={e} value={e}>
              {nombreEspacio(e)}
            </option>
          ))}
        </optgroup>
        <optgroup label="Liguilla">
          {RONDAS.map((r) => (
            <option key={r.id} value={r.id}>
              {r.nombre}
            </option>
          ))}
        </optgroup>
      </select>
    </label>
  )
}

/** Publicidad por jornada y por ronda de liguilla: un patrocinador oficial y los anuncios regulares que se quiera. */
export function SeccionPublicidad() {
  const { torneo } = useTorneo()
  const [espacio, setEspacio] = useState(() => espacioInicial(torneo))
  const [editando, setEditando] = useState<Anuncio | 'nuevo' | null>(null)
  const carga = useCobros(torneo.id)
  const cobros = carga.estado === 'listo' ? carga.cobros : {}
  const { oficial, regulares, oficialesRetirados } = anunciosDe(torneo, espacio)
  const sinPartidos = esLiguilla(espacio) && !partidosDeEspacio(torneo, espacio).length

  return (
    <section className="bloque">
      <h2 className="titulo-seccion">
        Publicidad <small>por jornada y por ronda de liguilla</small>
      </h2>
      <div className="tarjeta formulario">
        <div className="campos">
          <SelectorEspacio
            valor={espacio}
            onCambiar={(e) => {
              setEspacio(e)
              setEditando(null)
            }}
          />
        </div>
        {sinPartidos && (
          <p className="nota">
            Esta ronda aún no tiene partidos. Puedes venderla y dejar el anuncio publicado: aparece en el sitio cuando generes la ronda.
          </p>
        )}
        <ul className="publicidad-resumen">
          <li>
            Espacio oficial:{' '}
            {oficial ? (
              <strong>
                Ocupado · {oficial.negocio} ({ESTADOS[oficial.estado].toLowerCase()})
              </strong>
            ) : (
              <strong className="publicidad-libre">Libre</strong>
            )}
          </li>
          <li>
            Anuncios regulares: <strong>{regulares.filter((a) => a.estado !== 'retirado').length}</strong>
            {regulares.some((a) => a.estado === 'retirado') && ` (+${regulares.filter((a) => a.estado === 'retirado').length} retirados)`}
          </li>
        </ul>
        {carga.estado === 'error' && <p className="mensaje mensaje-error">No se pudieron leer los importes. Revisa las reglas de Firestore (colección cobros).</p>}
        {editando === null && (
          <div className="acciones">
            <button type="button" className="boton" onClick={() => setEditando('nuevo')}>
              + Nuevo anuncio
            </button>
          </div>
        )}
      </div>

      {editando !== null && (
        <FormAnuncio
          key={editando === 'nuevo' ? 'nuevo' : editando.id}
          espacio={espacio}
          anuncio={editando === 'nuevo' ? undefined : editando}
          cobro={editando === 'nuevo' ? undefined : cobros[editando.id]}
          oficialOcupado={!!oficial && (editando === 'nuevo' || oficial.id !== editando.id)}
          onListo={() => setEditando(null)}
        />
      )}

      <h3 className="publicidad-subtitulo">Patrocinador oficial</h3>
      {oficial ? (
        <TarjetaAnuncio anuncio={oficial} cobro={cobros[oficial.id]} oficialOcupado={false} onEditar={() => setEditando(oficial)} />
      ) : (
        <p className="vacio">Libre. Crea un anuncio de tipo “Patrocinador oficial” para {esLiguilla(espacio) ? 'esta ronda' : 'esta jornada'}.</p>
      )}

      <h3 className="publicidad-subtitulo">Anuncios regulares</h3>
      {regulares.length ? (
        <div className="lista-publicidad">
          {regulares.map((a, i) => (
            <TarjetaAnuncio
              key={a.id}
              anuncio={a}
              cobro={cobros[a.id]}
              oficialOcupado={false}
              onEditar={() => setEditando(a)}
              mover={{ arriba: i > 0, abajo: i < regulares.length - 1 }}
            />
          ))}
        </div>
      ) : (
        <p className="vacio">No hay anuncios regulares en {esLiguilla(espacio) ? 'esta ronda' : 'esta jornada'}.</p>
      )}

      {oficialesRetirados.length > 0 && (
        <details className="publicidad-retirados">
          <summary>Patrocinadores oficiales retirados ({oficialesRetirados.length})</summary>
          <div className="lista-publicidad">
            {oficialesRetirados.map((a) => (
              <TarjetaAnuncio key={a.id} anuncio={a} cobro={cobros[a.id]} oficialOcupado={!!oficial} onEditar={() => setEditando(a)} />
            ))}
          </div>
        </details>
      )}
    </section>
  )
}

function TarjetaAnuncio({
  anuncio: a,
  cobro,
  oficialOcupado,
  onEditar,
  mover,
}: {
  anuncio: Anuncio
  cobro?: Cobro
  /** Para un oficial retirado: si la jornada ya tiene otro, no se puede volver a publicar. */
  oficialOcupado: boolean
  onEditar: () => void
  mover?: { arriba: boolean; abajo: boolean }
}) {
  const { torneo } = useTorneo()
  const { guardar, guardando, aviso } = useGuardado()
  const [copiando, setCopiando] = useState(false)
  const v = vigencia(a)
  const seVe = a.estado === 'publicado' && v === 'vigente'

  return (
    <div className={`tarjeta formulario anuncio-admin${a.estado === 'retirado' ? ' anuncio-admin-retirado' : ''}`}>
      <div className="fila-admin">
        <LogoAnuncio anuncio={a} />
        <div className="fila-admin-texto">
          <strong>{a.negocio}</strong>
          <span>
            {fechaSinHora(a.inicio)} – {fechaSinHora(a.fin)}
          </span>
        </div>
        <span className={`insignia${a.estado === 'publicado' ? ' insignia-finalizado' : ''}`}>{ESTADOS[a.estado]}</span>
        <span className={`insignia${v === 'vigente' ? '' : ' insignia-aplazado'}`}>{VIGENCIAS[v]}</span>
      </div>
      <p className="nota">
        {seVe ? 'Se ve en el sitio ahora.' : a.estado !== 'publicado' ? 'No se ve en el sitio.' : v === 'programado' ? 'Se verá a partir del inicio.' : 'Ya no se ve: venció.'}
        {' · '}
        {cobro ? (
          <>
            {pesos(cobro.importe)} · <strong className={cobro.pagado ? 'pago-ok' : 'pago-pendiente'}>{cobro.pagado ? 'Pagado' : 'Pendiente'}</strong>
          </>
        ) : (
          'Sin importe registrado'
        )}
      </p>
      {aviso}
      <div className="acciones">
        <button type="button" className="boton boton-chico boton-secundario" onClick={onEditar}>
          Editar
        </button>
        {a.estado === 'publicado' ? (
          <button
            type="button"
            className="boton boton-chico boton-secundario"
            disabled={guardando}
            onClick={() => window.confirm(`¿Retirar el anuncio de ${a.negocio}? Deja de verse en el sitio.`) && guardar(() => cambiarEstadoAnuncio(torneo.id, a.id, 'retirado'), 'Anuncio retirado')}
          >
            Retirar
          </button>
        ) : (
          <button
            type="button"
            className="boton boton-chico"
            disabled={guardando || (a.tipo === 'oficial' && a.estado === 'retirado' && oficialOcupado)}
            title={a.tipo === 'oficial' && a.estado === 'retirado' && oficialOcupado ? 'Este espacio ya tiene otro patrocinador oficial' : undefined}
            onClick={() => guardar(() => cambiarEstadoAnuncio(torneo.id, a.id, 'publicado'), v === 'vigente' ? 'Publicado: ya se ve en el sitio' : 'Publicado; se verá dentro de su vigencia')}
          >
            Publicar
          </button>
        )}
        <button type="button" className="boton boton-chico boton-secundario" onClick={() => setCopiando(!copiando)}>
          {copiando ? 'Cancelar copia' : 'Usar en otra jornada o ronda'}
        </button>
        {mover && (
          <>
            <button type="button" className="boton boton-chico boton-secundario" aria-label="Subir" disabled={!mover.arriba || guardando} onClick={() => guardar(() => moverAnuncio(torneo.id, a.id, -1), 'Orden actualizado')}>
              ↑
            </button>
            <button type="button" className="boton boton-chico boton-secundario" aria-label="Bajar" disabled={!mover.abajo || guardando} onClick={() => guardar(() => moverAnuncio(torneo.id, a.id, 1), 'Orden actualizado')}>
              ↓
            </button>
          </>
        )}
        <button
          type="button"
          className="boton-enlace boton-peligro-texto"
          disabled={guardando}
          onClick={() => window.confirm(`¿Borrar el anuncio de ${a.negocio} y su importe? No se puede deshacer.`) && guardar(() => borrarAnuncio(torneo.id, a.id), 'Anuncio borrado')}
        >
          Borrar
        </button>
      </div>
      {copiando && <CopiarAnuncio anuncio={a} cobro={cobro} onListo={() => setCopiando(false)} />}
    </div>
  )
}

/** Espacio que sigue: la siguiente jornada, la siguiente ronda, o el mismo si ya es el último. */
function siguienteEspacio(t: Torneo, actual: Espacio): Espacio {
  const total = Math.max(1, ...t.partidos.filter((p) => p.fase === 'regular').map((p) => p.jornada ?? 1))
  const todos = [...Array.from({ length: total }, (_, i) => espacioJornada(i + 1)), ...RONDAS.map((r) => r.id)]
  return todos[Math.min(todos.length - 1, todos.indexOf(actual) + 1)] ?? actual
}

/** Reutiliza el anuncio en otra jornada o ronda como borrador, con su propia vigencia y su propio cobro (pendiente). */
function CopiarAnuncio({ anuncio, cobro, onListo }: { anuncio: Anuncio; cobro?: Cobro; onListo: () => void }) {
  const { torneo } = useTorneo()
  const [destino, setDestino] = useState(() => siguienteEspacio(torneo, espacioDe(anuncio)))
  const [fechas, setFechas] = useState(() => vigenciaSugerida(torneo, destino))
  const [hecho, setHecho] = useState(false)
  const { guardar, guardando, aviso } = useGuardado()

  async function copiar() {
    if (fechas.fin < fechas.inicio) throw new ErrorValidacion('La fecha de fin no puede ser antes del inicio.')
    await guardarAnuncio(
      torneo.id,
      {
        ...anuncio,
        id: nuevoId('an'),
        jornada: undefined,
        ronda: undefined,
        ...ubicacion(destino),
        inicio: fechas.inicio,
        fin: fechas.fin,
        estado: 'borrador',
      },
      { importe: cobro?.importe ?? 0, pagado: false },
    )
    setHecho(true)
  }

  return (
    <div className="publicidad-copia">
      <div className="campos">
        <SelectorEspacio
          etiqueta="Copiar a"
          valor={destino}
          onCambiar={(e) => {
            setDestino(e)
            setFechas(vigenciaSugerida(torneo, e))
          }}
        />
        <label className="campo">
          <span>Inicio</span>
          <input type="date" value={fechas.inicio} onChange={(e) => setFechas({ ...fechas, inicio: e.target.value })} />
        </label>
        <label className="campo">
          <span>Fin</span>
          <input type="date" value={fechas.fin} onChange={(e) => setFechas({ ...fechas, fin: e.target.value })} />
        </label>
      </div>
      <p className="nota">Se crea como borrador con pago pendiente; publícalo cuando quieras.</p>
      {aviso}
      <div className="acciones">
        {hecho ? (
          <button type="button" className="boton boton-chico boton-secundario" onClick={onListo}>
            Listo
          </button>
        ) : (
          <button type="button" className="boton boton-chico" disabled={guardando} onClick={() => guardar(copiar, `Copiado a ${nombreEspacio(destino)} como borrador. Publícalo desde ahí.`)}>
            Crear copia
          </button>
        )}
      </div>
    </div>
  )
}

function FormAnuncio({
  espacio,
  anuncio,
  cobro,
  oficialOcupado,
  onListo,
}: {
  espacio: Espacio
  anuncio?: Anuncio
  cobro?: Cobro
  oficialOcupado: boolean
  onListo: () => void
}) {
  const { torneo } = useTorneo()
  const sugerida = vigenciaSugerida(torneo, espacio)
  const [tipo, setTipo] = useState<TipoAnuncio>(anuncio?.tipo ?? (oficialOcupado ? 'regular' : 'oficial'))
  const [negocio, setNegocio] = useState(anuncio?.negocio ?? '')
  const [logo, setLogo] = useState(anuncio?.logo ?? '')
  const [mensaje, setMensaje] = useState(anuncio?.mensaje ?? '')
  const [enlace, setEnlace] = useState(anuncio?.enlace ?? '')
  const [textoBoton, setTextoBoton] = useState(anuncio?.textoBoton ?? '')
  const [inicio, setInicio] = useState(anuncio?.inicio ?? sugerida.inicio)
  const [fin, setFin] = useState(anuncio?.fin ?? sugerida.fin)
  const [importe, setImporte] = useState(cobro ? String(cobro.importe) : '')
  const [pagado, setPagado] = useState(cobro?.pagado ?? false)
  const { guardar, guardando, aviso } = useGuardado()

  const borrador: Anuncio = {
    id: anuncio?.id ?? '',
    ...ubicacion(espacio),
    tipo,
    negocio: negocio.trim() || 'Nombre del negocio',
    logo: logo || undefined,
    mensaje: mensaje.trim() || undefined,
    enlace: enlace.trim() || undefined,
    textoBoton: tipo === 'oficial' ? textoBoton.trim() || undefined : undefined,
    inicio,
    fin,
    orden: anuncio?.orden ?? 0,
    estado: anuncio?.estado ?? 'borrador',
  }

  async function enviar() {
    if (!negocio.trim()) throw new ErrorValidacion('Escribe el nombre del negocio.')
    if (enlace.trim() && !enlaceSeguro(enlace)) throw new ErrorValidacion('El enlace debe ser una página (https://…), un teléfono de WhatsApp de 10 dígitos, tel: o mailto:.')
    if (!inicio || !fin) throw new ErrorValidacion('Captura la fecha de inicio y la de fin.')
    if (fin < inicio) throw new ErrorValidacion('La fecha de fin no puede ser antes del inicio.')
    const monto = importe.trim() ? Number(importe.replace(',', '.')) : 0
    if (!Number.isFinite(monto) || monto < 0) throw new ErrorValidacion('El importe debe ser un número en pesos, sin signo.')
    await guardarAnuncio(
      torneo.id,
      { ...borrador, id: anuncio?.id ?? nuevoId('an'), negocio: negocio.trim() },
      { importe: Math.round(monto * 100) / 100, pagado },
    )
    onListo()
  }

  return (
    <form
      className="tarjeta formulario"
      onSubmit={(e) => {
        e.preventDefault()
        guardar(enviar, anuncio ? 'Anuncio actualizado' : 'Anuncio guardado como borrador')
      }}
    >
      <h3 className="formulario-titulo">
        {anuncio ? `Editar anuncio · ${anuncio.negocio}` : `Nuevo anuncio · ${nombreEspacio(espacio)}`}
      </h3>
      <div className="campos">
        <label className="campo">
          <span>Negocio</span>
          <input value={negocio} maxLength={60} onChange={(e) => setNegocio(e.target.value)} required />
        </label>
        <label className="campo">
          <span>Tipo de espacio</span>
          <select value={tipo} onChange={(e) => setTipo(e.target.value as TipoAnuncio)}>
            <option value="oficial" disabled={oficialOcupado}>
              Patrocinador oficial{oficialOcupado ? ' (ocupado)' : ''}
            </option>
            <option value="regular">Anuncio regular</option>
          </select>
        </label>
        <label className="campo">
          <span>Logo</span>
          <select value={logo} onChange={(e) => setLogo(e.target.value)}>
            <option value="">Sin logo (iniciales)</option>
            {[...LOGOS.keys()].map((nombre) => (
              <option key={nombre} value={nombre}>
                {nombre}
              </option>
            ))}
            {logo && !LOGOS.has(logo) && <option value={logo}>{logo} (no está en el catálogo)</option>}
          </select>
        </label>
      </div>
      <label className="campo">
        <span>Mensaje breve (opcional)</span>
        <input value={mensaje} maxLength={120} placeholder="Ej. Tacos y tortas · abierto todos los días" onChange={(e) => setMensaje(e.target.value)} />
      </label>
      <div className="campos">
        <label className="campo">
          <span>Enlace (opcional)</span>
          <input value={enlace} maxLength={300} placeholder="WhatsApp de 10 dígitos o https://…" onChange={(e) => setEnlace(e.target.value)} />
        </label>
        {tipo === 'oficial' && (
          <label className="campo">
            <span>Texto del botón</span>
            <input value={textoBoton} maxLength={20} placeholder="Contactar" onChange={(e) => setTextoBoton(e.target.value)} />
          </label>
        )}
        <label className="campo">
          <span>Inicio</span>
          <input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} required />
        </label>
        <label className="campo">
          <span>Fin</span>
          <input type="date" value={fin} onChange={(e) => setFin(e.target.value)} required />
        </label>
      </div>
      <fieldset className="publicidad-cobro">
        <legend>Cobro · solo lo ven los administradores</legend>
        <div className="campos">
          <label className="campo">
            <span>Importe acordado (MXN)</span>
            <input inputMode="decimal" value={importe} placeholder="0" onChange={(e) => setImporte(e.target.value)} />
          </label>
          <label className="campo">
            <span>Estado de pago</span>
            <select value={pagado ? 'pagado' : 'pendiente'} onChange={(e) => setPagado(e.target.value === 'pagado')}>
              <option value="pendiente">Pendiente</option>
              <option value="pagado">Pagado</option>
            </select>
          </label>
        </div>
        <p className="nota">Marcar “Pagado” no publica el anuncio: se publica aparte con “Publicar”.</p>
      </fieldset>

      <div className="publicidad-vista">
        <span className="publicidad-vista-etiqueta">Vista previa</span>
        {tipo === 'oficial' ? <PatrocinadorOficial anuncio={borrador} /> : <AnunciosRegulares anuncios={[borrador]} />}
      </div>

      {aviso}
      <div className="acciones">
        <button type="submit" className="boton" disabled={guardando}>
          {anuncio ? 'Guardar cambios' : 'Guardar como borrador'}
        </button>
        <button type="button" className="boton boton-secundario" onClick={onListo}>
          Cancelar
        </button>
      </div>
    </form>
  )
}
