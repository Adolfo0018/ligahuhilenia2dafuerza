import { liga } from '../data'
import { iniciales, nombreLiga, nombreTorneo } from '../lib/formato'
import type { Torneo } from '../types'

interface Props {
  torneos: Torneo[]
  /** Vacío mientras cargan los torneos o si todavía no hay ninguno. */
  actual?: Torneo
  onCambiar: (id: string) => void
}

export function Encabezado({ torneos, actual, onCambiar }: Props) {
  return (
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
            <h1 className="marca-torneo">{actual ? nombreTorneo(actual) : liga.nombre}</h1>
          </div>
        </div>
        {torneos.length > 1 && (
          <div className="selector-torneo" role="group" aria-label="Elegir torneo">
            {torneos.map((t) => (
              <button key={t.id} type="button" aria-pressed={t.id === actual?.id} onClick={() => onCambiar(t.id)}>
                {nombreTorneo(t)}
                <span className="selector-estado">{t.estado === 'terminado' ? 'Terminado' : 'En curso'}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </header>
  )
}
