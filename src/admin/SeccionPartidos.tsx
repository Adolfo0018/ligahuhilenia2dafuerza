import { useState, type FormEvent } from 'react'
import { Escudo } from '../components/Escudo'
import { useTorneo } from '../lib/contexto'
import { fechaCorta } from '../lib/formato'
import { estaPublicado, jornadaActual, juegaEn, marcador, porFecha } from '../lib/partidos'
import { modificarTorneo } from '../lib/repositorio'
import type { EstadoPartido, Partido } from '../types'
import { CapturaResultado } from './CapturaResultado'
import { useGuardado } from './useGuardado'
import { nuevoId } from './utilidades'

const ESTADOS: Record<EstadoPartido, string> = {
  programado: 'Programado',
  aplazado: 'Aplazado',
  revision: 'En revisión',
  finalizado: 'Final',
  administrativo: 'Por default',
}

export function SeccionPartidos() {
  const { torneo } = useTorneo()
  const regulares = torneo.partidos.filter((p) => p.fase === 'regular')
  // Todos contra todos a una vuelta: con número impar de equipos hay tantas jornadas como equipos (RN-012).
  const n = torneo.equipos.length
  const esperadas = n % 2 ? n : n - 1
  const total = Math.max(1, esperadas, ...regulares.map((p) => p.jornada ?? 1))
  const [jornada, setJornada] = useState(() => (regulares.length ? jornadaActual(torneo) : 1))
  const [agregando, setAgregando] = useState(false)

  if (torneo.equipos.length < 2) {
    return <p className="vacio">Primero inscribe al menos dos equipos en “Equipos y jugadores”.</p>
  }

  const partidos = regulares.filter((p) => p.jornada === jornada).sort(porFecha)
  const juegan = new Set(partidos.flatMap((p) => [p.localId, p.visitanteId]))
  const sinPartido = torneo.equipos.filter((e) => !juegan.has(e.id))

  return (
    <>
      <div className="jornadas">
        <button type="button" className="flecha" aria-label="Jornada anterior" disabled={jornada <= 1} onClick={() => setJornada(jornada - 1)}>
          ‹
        </button>
        <div className="jornadas-lista" role="group" aria-label="Jornadas">
          {Array.from({ length: total }, (_, i) => i + 1).map((j) => (
            <button
              key={j}
              type="button"
              className="jornada-chip"
              aria-pressed={j === jornada}
              aria-label={`Jornada ${j}`}
              onClick={() => {
                setJornada(j)
                setAgregando(false)
              }}
            >
              J{j}
            </button>
          ))}
        </div>
        <button type="button" className="flecha" aria-label="Jornada siguiente" disabled={jornada >= total} onClick={() => setJornada(jornada + 1)}>
          ›
        </button>
      </div>

      <div className="admin-titulo">
        <h2 className="titulo-seccion">
          Jornada {jornada} <small>{partidos.length === 1 ? '1 partido' : `${partidos.length} partidos`}</small>
        </h2>
        {!agregando && (
          <button type="button" className="boton" onClick={() => setAgregando(true)}>
            + Agregar partido
          </button>
        )}
      </div>
      <p className="nota">El generador automático del calendario llega en la fase 3; mientras tanto los partidos se agregan aquí uno por uno.</p>

      {agregando && <FormPartido jornadaInicial={jornada} onListo={() => setAgregando(false)} />}
      {partidos.length ? (
        <div className="lista-admin">
          {partidos.map((p) => (
            <TarjetaPartidoAdmin key={p.id} partido={p} />
          ))}
        </div>
      ) : (
        !agregando && <p className="vacio">Esta jornada todavía no tiene partidos.</p>
      )}
      {partidos.length > 0 && sinPartido.length > 0 && (
        <p className="nota">Sin partido en esta jornada: {sinPartido.map((e) => e.nombre).join(', ')}.</p>
      )}
    </>
  )
}

function TarjetaPartidoAdmin({ partido }: { partido: Partido }) {
  const { torneo, equipo } = useTorneo()
  const [modo, setModo] = useState<'ver' | 'editar' | 'resultado'>('ver')
  const { guardar, aviso } = useGuardado()
  const publicado = estaPublicado(partido)
  const m = publicado ? marcador(partido) : null

  function aplazar() {
    if (!window.confirm('¿Aplazar este partido? Conserva su jornada y queda con fecha por definir.')) return
    guardar(
      () =>
        modificarTorneo(torneo.id, (t) => ({
          partidos: t.partidos.map((p) => (p.id === partido.id ? { ...p, estado: 'aplazado', fecha: '' } : p)),
        })),
      'Partido aplazado',
    )
  }

  function borrar() {
    const texto = publicado ? '¿Borrar este partido y su resultado? Se quitará de la tabla y de las estadísticas.' : '¿Borrar este partido?'
    if (!window.confirm(texto)) return
    guardar(() => modificarTorneo(torneo.id, (t) => ({ partidos: t.partidos.filter((p) => p.id !== partido.id) })), 'Partido borrado')
  }

  if (modo === 'editar') return <FormPartido partido={partido} jornadaInicial={partido.jornada ?? 1} onListo={() => setModo('ver')} />
  if (modo === 'resultado') return <CapturaResultado partido={partido} onListo={() => setModo('ver')} />

  return (
    <div className="tarjeta tarjeta-partido-admin">
      <div className="partido-meta">
        <span className="partido-cuando">
          {fechaCorta(partido.fecha)} · {partido.cancha || 'Cancha por definir'}
        </span>
        <span className={`insignia insignia-${partido.estado}`}>{ESTADOS[partido.estado]}</span>
      </div>
      {[partido.localId, partido.visitanteId].map((id, i) => (
        <span key={id} className="fila-equipo">
          <Escudo equipo={equipo(id)} />
          <span className="fila-nombre">{equipo(id).nombre}</span>
          {m && <span className="fila-goles">{i === 0 ? m.local : m.visitante}</span>}
        </span>
      ))}
      {aviso}
      <div className="acciones">
        <button type="button" className="boton boton-chico" onClick={() => setModo('resultado')}>
          {publicado ? 'Editar resultado' : 'Capturar resultado'}
        </button>
        <button type="button" className="boton boton-chico boton-secundario" onClick={() => setModo('editar')}>
          {partido.estado === 'aplazado' ? 'Reprogramar' : 'Editar'}
        </button>
        {partido.estado === 'programado' && (
          <button type="button" className="boton boton-chico boton-secundario" onClick={aplazar}>
            Aplazar
          </button>
        )}
        <button type="button" className="boton boton-chico boton-peligro-texto" onClick={borrar}>
          Borrar
        </button>
      </div>
    </div>
  )
}

function FormPartido({ partido, jornadaInicial, onListo }: { partido?: Partido; jornadaInicial: number; onListo: () => void }) {
  const { torneo, equipo } = useTorneo()
  const [jornada, setJornada] = useState(String(jornadaInicial))
  const [fecha, setFecha] = useState(partido?.fecha ?? '')
  const [cancha, setCancha] = useState(partido?.cancha ?? '')
  const [localId, setLocalId] = useState(partido?.localId ?? '')
  const [visitanteId, setVisitanteId] = useState(partido?.visitanteId ?? '')
  const { guardar, fallar, guardando, aviso } = useGuardado()
  // Con resultado ya capturado no se cambian los equipos: los goles y tarjetas son de esos jugadores.
  const equiposFijos = !!partido && (estaPublicado(partido) || partido.eventos.length > 0)
  const canchas = [...new Set(torneo.partidos.map((p) => p.cancha).filter(Boolean))].sort()
  const equipos = [...torneo.equipos].sort((a, b) => a.nombre.localeCompare(b.nombre))

  async function enviar(e: FormEvent) {
    e.preventDefault()
    const j = Number(jornada)
    if (!Number.isInteger(j) || j < 1 || j > 60) return fallar('La jornada debe ser un número de 1 a 60.')
    if (!localId || !visitanteId) return fallar('Elige a los dos equipos.')
    if (localId === visitanteId) return fallar('Un equipo no puede jugar contra sí mismo.')
    const otros = torneo.partidos.filter((p) => p.fase === 'regular' && p.id !== partido?.id)
    // A una vuelta, cada pareja se enfrenta una sola vez en la fase regular.
    const repetido = otros.find((p) => juegaEn(p, localId) && juegaEn(p, visitanteId))
    if (repetido) return fallar(`Ese partido ya existe en la jornada ${repetido.jornada}.`)
    const ocupado = [localId, visitanteId].find((id) => otros.some((p) => p.jornada === j && juegaEn(p, id)))
    if (ocupado) return fallar(`${equipo(ocupado).nombre} ya tiene partido en la jornada ${j}.`)

    const datos = { jornada: j, fecha, cancha: cancha.trim(), localId, visitanteId }
    const ok = await guardar(
      () =>
        modificarTorneo(torneo.id, (t) => ({
          partidos: partido
            ? t.partidos.map((p) => {
                if (p.id !== partido.id) return p
                // Ponerle fecha a un partido aplazado lo reprograma.
                const estado: EstadoPartido = p.estado === 'aplazado' && fecha ? 'programado' : p.estado
                return { ...p, ...datos, estado }
              })
            : [...t.partidos, { id: nuevoId('pa'), fase: 'regular', estado: 'programado', eventos: [], ...datos }],
        })),
      partido ? 'Partido actualizado' : 'Partido agregado',
    )
    if (ok) onListo()
  }

  return (
    <form className="tarjeta formulario" onSubmit={enviar}>
      <h3 className="formulario-titulo">{partido ? (partido.estado === 'aplazado' ? 'Reprogramar partido' : 'Editar partido') : 'Nuevo partido'}</h3>
      <div className="campos">
        <label className="campo">
          <span>Local</span>
          <select value={localId} onChange={(e) => setLocalId(e.target.value)} disabled={equiposFijos} required>
            <option value="">Elige equipo</option>
            {equipos.map((eq) => (
              <option key={eq.id} value={eq.id}>
                {eq.nombre}
              </option>
            ))}
          </select>
        </label>
        <label className="campo">
          <span>Visitante</span>
          <select value={visitanteId} onChange={(e) => setVisitanteId(e.target.value)} disabled={equiposFijos} required>
            <option value="">Elige equipo</option>
            {equipos.map((eq) => (
              <option key={eq.id} value={eq.id}>
                {eq.nombre}
              </option>
            ))}
          </select>
        </label>
        <label className="campo campo-corto">
          <span>Jornada</span>
          <input type="number" inputMode="numeric" min={1} max={60} value={jornada} onChange={(e) => setJornada(e.target.value)} required />
        </label>
        <label className="campo">
          <span>Fecha y hora</span>
          <input type="datetime-local" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </label>
        <label className="campo">
          <span>Cancha</span>
          <input value={cancha} onChange={(e) => setCancha(e.target.value)} list="canchas" maxLength={40} placeholder="Ej. Cancha 1" />
          <datalist id="canchas">
            {canchas.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </label>
      </div>
      {!fecha && <p className="nota">Sin fecha, el partido aparece como “Fecha por definir”.</p>}
      {aviso}
      <div className="acciones">
        <button type="submit" className="boton" disabled={guardando}>
          {partido ? 'Guardar' : 'Agregar partido'}
        </button>
        <button type="button" className="boton boton-secundario" onClick={onListo}>
          Cancelar
        </button>
      </div>
    </form>
  )
}
