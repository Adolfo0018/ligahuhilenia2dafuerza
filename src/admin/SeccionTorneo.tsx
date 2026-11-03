import { useState, type FormEvent } from 'react'
import { useTorneo } from '../lib/contexto'
import { PLAZO_CAPTURA_HORAS } from '../lib/delegados'
import { nombreTorneo } from '../lib/formato'
import { borrarTorneo, modificarTorneo } from '../lib/repositorio'
import type { EstadoTorneo, TipoCompetencia } from '../types'
import { useGuardado } from './useGuardado'

/** Firestore no acepta documentos de más de 1 MB; un torneo normal ocupa mucho menos. */
const LIMITE_DOCUMENTO = 1024 * 1024

export function SeccionTorneo() {
  const { torneo } = useTorneo()
  const [nombre, setNombre] = useState(torneo.nombre)
  const [tipo, setTipo] = useState<TipoCompetencia>(torneo.tipo)
  const [estado, setEstado] = useState<EstadoTorneo>(torneo.estado)
  const [plazo, setPlazo] = useState(String(torneo.plazoCapturaHoras ?? PLAZO_CAPTURA_HORAS))
  const { guardar, fallar, guardando, aviso } = useGuardado()
  const tamano = new Blob([JSON.stringify(torneo)]).size
  const publicados = torneo.partidos.filter((p) => p.estado === 'finalizado' || p.estado === 'administrativo').length

  function guardarCambios(e: FormEvent) {
    e.preventDefault()
    if (!nombre.trim()) return fallar('Escribe el nombre del torneo.')
    const horas = Number(plazo)
    if (!Number.isInteger(horas) || horas < 1 || horas > 168) return fallar('El plazo de captura debe ser de 1 a 168 horas.')
    guardar(
      () => modificarTorneo(torneo.id, () => ({ nombre: nombre.trim(), tipo, estado, plazoCapturaHoras: horas })),
      'Cambios guardados',
    )
  }

  function borrar() {
    const confirmado = window.confirm(
      `¿Borrar ${nombreTorneo(torneo)}? Se perderán sus equipos, jugadores y partidos, y no se puede deshacer.`,
    )
    if (confirmado) guardar(() => borrarTorneo(torneo.id), 'Torneo borrado')
  }

  return (
    <>
      <form className="tarjeta formulario" onSubmit={guardarCambios}>
        <h2 className="titulo-seccion">Datos del torneo</h2>
        <div className="campos">
          <label className="campo">
            <span>Competencia</span>
            <select value={tipo} onChange={(e) => setTipo(e.target.value as TipoCompetencia)}>
              <option value="liga">Liga</option>
              <option value="copa">Copa</option>
            </select>
          </label>
          <label className="campo">
            <span>Nombre</span>
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={40} required />
          </label>
          <label className="campo">
            <span>Estado</span>
            <select value={estado} onChange={(e) => setEstado(e.target.value as EstadoTorneo)}>
              <option value="regular">En curso: fase regular</option>
              <option value="liguilla">En curso: liguilla</option>
              <option value="terminado">Terminado</option>
            </select>
          </label>
          <label className="campo">
            <span>Plazo de captura de los delegados (horas)</span>
            <input type="number" inputMode="numeric" min={1} max={168} value={plazo} onChange={(e) => setPlazo(e.target.value)} />
          </label>
        </div>
        <p className="nota">
          Al terminar el torneo, las suspensiones pendientes se eliminan. El sitio muestra primero el torneo en curso.
        </p>
        {aviso}
        <div className="acciones">
          <button type="submit" className="boton" disabled={guardando}>
            Guardar cambios
          </button>
        </div>
      </form>

      <div className="tarjeta formulario">
        <h2 className="titulo-seccion">Resumen</h2>
        <ul className="resumen">
          <li>
            <strong>{torneo.equipos.length}</strong> equipos
          </li>
          <li>
            <strong>{torneo.jugadores.length}</strong> jugadores
          </li>
          <li>
            <strong>{torneo.partidos.length}</strong> partidos, {publicados} con resultado
          </li>
          <li>
            <strong>{Math.round((tamano / LIMITE_DOCUMENTO) * 100)}%</strong> del espacio de un torneo
          </li>
        </ul>
      </div>

      <div className="tarjeta formulario zona-peligro">
        <h2 className="titulo-seccion">Borrar torneo</h2>
        <p className="nota">Se borra todo lo del torneo: equipos, jugadores, partidos y resultados. No se puede deshacer.</p>
        <div className="acciones">
          <button type="button" className="boton boton-peligro" onClick={borrar} disabled={guardando}>
            Borrar {nombreTorneo(torneo)}
          </button>
        </div>
      </div>
    </>
  )
}
