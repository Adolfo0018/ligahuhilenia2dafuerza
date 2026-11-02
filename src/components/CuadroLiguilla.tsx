import { cruzar, RONDAS, sembrar, type Llave } from '../lib/liguilla'
import { estaPublicado, golesDe } from '../lib/partidos'
import { LUGARES_LIGUILLA, type FilaTabla } from '../lib/tabla'
import type { Partido } from '../types'
import { Escudo } from './Escudo'

export function CuadroLiguilla({ llaves }: { llaves: Llave[] }) {
  const campeon = llaves.find((l) => l.ronda === 'final')?.ganador
  return (
    <>
      {campeon && (
        <div className="campeon">
          <span className="campeon-copa" aria-hidden="true">
            🏆
          </span>
          <Escudo equipo={campeon.equipo} />
          <div>
            <p className="campeon-titulo">Campeón</p>
            <p className="campeon-nombre">{campeon.equipo.nombre}</p>
          </div>
        </div>
      )}
      <div className="cuadro">
        {RONDAS.map((r) => {
          const deRonda = llaves.filter((l) => l.ronda === r.id)
          if (!deRonda.length) return null
          return (
            <section key={r.id} className="cuadro-ronda">
              <h2 className="cuadro-titulo">{r.nombre}</h2>
              {deRonda.map((l) => (
                <TarjetaLlave key={l.numero} llave={l} />
              ))}
            </section>
          )
        })}
      </div>
      <p className="leyenda">
        Ida y vuelta. Si el global queda empatado avanza el mejor de la tabla; en la final se juega tiempo extra y, si sigue el
        empate, penales.
      </p>
    </>
  )
}

function TarjetaLlave({ llave }: { llave: Llave }) {
  const goles = (p: Partido | undefined, id: string) => (p && estaPublicado(p) ? golesDe(p, id).aFavor : '–')
  return (
    <div className="llave">
      <table className="llave-tabla">
        <ColumnasLlave goles />
        <thead>
          <tr>
            <th scope="col">
              <span className="sr-only">Lugar</span>
            </th>
            <th scope="col">
              <span className="sr-only">Equipo</span>
            </th>
            <th scope="col">Ida</th>
            <th scope="col">Vta</th>
            <th scope="col">Global</th>
          </tr>
        </thead>
        <tbody>
          {[llave.alto, llave.bajo].map((s) => {
            const clase = llave.ganador ? (llave.ganador.equipo.id === s.equipo.id ? 'avanza' : 'eliminado') : undefined
            return (
              <tr key={s.equipo.id} className={clase}>
                <td className="llave-lugar">{s.lugar}</td>
                <th scope="row" className="llave-equipo">
                  <span className="equipo-celda">
                    <Escudo equipo={s.equipo} chico />
                    <span>{s.equipo.nombre}</span>
                  </span>
                </th>
                <td>{goles(llave.ida, s.equipo.id)}</td>
                <td>{goles(llave.vuelta, s.equipo.id)}</td>
                <td className="llave-global">{llave.global ? (s === llave.alto ? llave.global.alto : llave.global.bajo) : '–'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <NotaLlave llave={llave} />
    </div>
  )
}

/** Lugar y goles con ancho fijo; el nombre del equipo usa el resto. */
function ColumnasLlave({ goles = false }: { goles?: boolean }) {
  return (
    <colgroup>
      <col className="col-llave-lugar" />
      <col />
      {goles && (
        <>
          <col className="col-llave-goles" />
          <col className="col-llave-goles" />
          <col className="col-llave-goles" />
        </>
      )}
    </colgroup>
  )
}

function NotaLlave({ llave }: { llave: Llave }) {
  let nota = ''
  if (llave.desempate === 'posicion') nota = `Global empatado: avanza ${llave.alto.equipo.nombre} por mejor posición`
  else if (llave.desempate === 'penales' && llave.penales)
    nota = `Global empatado tras el tiempo extra · Penales ${llave.penales.alto}-${llave.penales.bajo}`
  else if (!llave.global) nota = llave.ida && estaPublicado(llave.ida) ? 'Falta la vuelta' : 'Por jugarse'
  return nota ? <p className="llave-nota">{nota}</p> : null
}

/** Antes de la liguilla se muestra cómo quedarían los cuartos con la tabla actual. */
export function ProyeccionLiguilla({ tabla }: { tabla: FilaTabla[] }) {
  const cruces = cruzar(sembrar(tabla, LUGARES_LIGUILLA))
  return (
    <>
      <p className="aviso">
        La liguilla empieza al terminar la fase regular. Así quedarían los cuartos de final si la fase regular terminara hoy:
      </p>
      <div className="cuadro cuadro-proyeccion">
        {cruces.map(([alto, bajo]) => (
          <div key={alto.equipo.id} className="llave">
            <table className="llave-tabla">
              <ColumnasLlave />
              <tbody>
                {[alto, bajo].map((s) => (
                  <tr key={s.equipo.id}>
                    <td className="llave-lugar">{s.lugar}</td>
                    <th scope="row" className="llave-equipo">
                      <span className="equipo-celda">
                        <Escudo equipo={s.equipo} chico />
                        <span>{s.equipo.nombre}</span>
                      </span>
                    </th>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </>
  )
}
