import { signOut, type User } from 'firebase/auth'
import { useState } from 'react'
import { Segmentado } from '../components/Segmentado'
import { liga } from '../data'
import { ProveedorTorneo } from '../lib/contexto'
import { iniciales, nombreLiga, nombreTorneo } from '../lib/formato'
import { auth } from '../lib/sesion'
import { useTorneos } from '../lib/torneos'
import { NuevoTorneo } from './NuevoTorneo'
import { SeccionEquipos } from './SeccionEquipos'
import type { Torneo } from '../types'
import { SeccionPartidos } from './SeccionPartidos'
import { SeccionPendientes, usePendientes } from './SeccionPendientes'
import { SeccionTorneo } from './SeccionTorneo'

type Seccion = 'pendientes' | 'partidos' | 'equipos' | 'torneo'

/** Secciones del torneo elegido; "Pendientes" muestra cuántas cosas esperan al administrador. */
function ContenidoTorneo({ torneo, seccion, onSeccion }: { torneo: Torneo; seccion: Seccion; onSeccion: (s: Seccion) => void }) {
  const { total } = usePendientes(torneo)
  const secciones: { id: Seccion; nombre: string }[] = [
    { id: 'pendientes', nombre: total ? `Pendientes (${total})` : 'Pendientes' },
    { id: 'partidos', nombre: 'Partidos' },
    { id: 'equipos', nombre: 'Equipos y jugadores' },
    { id: 'torneo', nombre: 'Torneo' },
  ]
  return (
    <>
      <Segmentado etiqueta="Sección" opciones={secciones} valor={seccion} onCambiar={onSeccion} ajustable />
      <div className="admin-seccion">
        {seccion === 'pendientes' && <SeccionPendientes />}
        {seccion === 'partidos' && <SeccionPartidos />}
        {seccion === 'equipos' && <SeccionEquipos />}
        {seccion === 'torneo' && <SeccionTorneo />}
      </div>
    </>
  )
}

export function Panel({ usuario }: { usuario: User }) {
  const carga = useTorneos()
  const [torneoId, setTorneoId] = useState('')
  const [seccion, setSeccion] = useState<Seccion>('partidos')
  const [creando, setCreando] = useState(false)
  const torneos = carga.estado === 'listo' ? carga.torneos : []
  const torneo = torneos.find((t) => t.id === torneoId) ?? torneos[0]

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
              <h1 className="marca-torneo">Administración</h1>
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
        {carga.estado === 'cargando' && <p className="vacio">Cargando torneos…</p>}
        {carga.estado === 'error' && (
          <p className="mensaje mensaje-error">No se pudieron cargar los torneos. Revisa tu conexión y las reglas de Firestore.</p>
        )}
        {carga.estado === 'listo' && (
          <>
            <div className="admin-barra">
              {torneo && (
                <label className="campo admin-selector">
                  <span>Torneo</span>
                  <select value={torneo.id} onChange={(e) => setTorneoId(e.target.value)}>
                    {torneos.map((t) => (
                      <option key={t.id} value={t.id}>
                        {nombreTorneo(t)}
                        {t.estado === 'terminado' ? ' (terminado)' : ' (en curso)'}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <button type="button" className="boton boton-secundario" onClick={() => setCreando(!creando)}>
                {creando ? 'Cancelar' : '+ Nuevo torneo'}
              </button>
            </div>

            {creando && (
              <NuevoTorneo
                torneos={torneos}
                onCreado={(id) => {
                  setTorneoId(id)
                  setCreando(false)
                  setSeccion('equipos')
                }}
              />
            )}

            {torneo ? (
              <ProveedorTorneo torneo={torneo}>
                <ContenidoTorneo key={torneo.id} torneo={torneo} seccion={seccion} onSeccion={setSeccion} />
              </ProveedorTorneo>
            ) : (
              !creando && <p className="vacio">Todavía no hay torneos. Crea el primero con “Nuevo torneo”.</p>
            )}
          </>
        )}
      </main>
    </>
  )
}
