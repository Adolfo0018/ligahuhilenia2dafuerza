import { useState } from 'react'
import { guardarConfigSitio, PARTES, useConfigSitio, type ConfigSitio, type IdParte } from '../lib/sitio'
import { useGuardado } from './useGuardado'

/** Qué secciones se ven en el sitio público; aplica a todos los torneos. */
export function SeccionSitio() {
  const carga = useConfigSitio()
  if (carga.estado === 'cargando') return <p className="vacio">Cargando…</p>
  return <FormSitio inicial={carga.config} />
}

function FormSitio({ inicial }: { inicial: ConfigSitio }) {
  const [ocultos, setOcultos] = useState<IdParte[]>(inicial.ocultos)
  const { guardar, guardando, aviso } = useGuardado()
  const visible = (id: IdParte) => !ocultos.includes(id)
  const cambiar = (id: IdParte, ver: boolean) => setOcultos(ver ? ocultos.filter((o) => o !== id) : [...ocultos, id])
  const cambios = [...ocultos].sort().join() !== [...inicial.ocultos].sort().join()

  return (
    <section className="bloque">
      <h2 className="titulo-seccion">
        Sitio público <small>aplica a todos los torneos</small>
      </h2>
      <div className="tarjeta formulario">
        <p className="nota">Desmarca lo que no quieras mostrar. Los datos no se borran: al volver a marcarlo, aparece igual que antes.</p>
        <ul className="lista-sitio">
          {PARTES.map((parte) => (
            <li key={parte.id}>
              <label className="casilla">
                <input type="checkbox" checked={visible(parte.id)} onChange={(e) => cambiar(parte.id, e.target.checked)} />
                <strong>{parte.nombre}</strong>
              </label>
              {'hijos' in parte && (
                <ul className="lista-sitio-hijos">
                  {parte.hijos.map((h) => (
                    <li key={h.id}>
                      <label className="casilla">
                        <input
                          type="checkbox"
                          checked={visible(parte.id) && visible(h.id)}
                          disabled={!visible(parte.id)}
                          onChange={(e) => cambiar(h.id, e.target.checked)}
                        />
                        {h.nombre}
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
        {!visible('acceso') && (
          <p className="nota">
            Sin el enlace, tú y los delegados entran escribiendo la dirección <code>{window.location.origin}/admin</code>.
          </p>
        )}
        {aviso}
        <div className="acciones">
          <button type="button" className="boton" disabled={guardando || !cambios} onClick={() => guardar(() => guardarConfigSitio({ ocultos }), 'Sitio actualizado')}>
            Guardar
          </button>
          {cambios && (
            <button type="button" className="boton boton-secundario" onClick={() => setOcultos(inicial.ocultos)}>
              Deshacer
            </button>
          )}
          <a className="boton-enlace" href="/" target="_blank" rel="noreferrer">
            Ver sitio
          </a>
        </div>
      </div>
    </section>
  )
}
