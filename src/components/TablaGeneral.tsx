import { LUGARES_LIGUILLA, type FilaTabla } from '../lib/tabla'
import { Escudo } from './Escudo'
import { Racha } from './Racha'

// Las columnas que usa la liga; "puntos a favor/en contra" son goles.
const COLUMNAS = [
  { clave: 'juegos', corto: 'J', nombre: 'Juegos' },
  { clave: 'ganados', corto: 'G', nombre: 'Ganados' },
  { clave: 'empatados', corto: 'E', nombre: 'Empatados' },
  { clave: 'perdidos', corto: 'P', nombre: 'Perdidos' },
  { clave: 'aFavor', corto: 'PF', nombre: 'Puntos a favor' },
  { clave: 'enContra', corto: 'PC', nombre: 'Puntos en contra' },
  { clave: 'diferencia', corto: 'Dif', nombre: 'Diferencia' },
  { clave: 'puntos', corto: 'Pts', nombre: 'Puntos' },
] as const

export function TablaGeneral({ tabla }: { tabla: FilaTabla[] }) {
  return (
    <>
      <div className="tarjeta tabla-envoltura">
        <table className="tabla">
          <caption className="sr-only">Tabla general de la fase regular</caption>
          <thead>
            <tr>
              <th scope="col" className="col-lugar">
                #
              </th>
              <th scope="col" className="col-equipo">
                Equipo
              </th>
              {COLUMNAS.map((c) => (
                <th key={c.clave} scope="col" className={c.clave === 'puntos' ? 'col-pts' : undefined}>
                  <abbr title={c.nombre}>{c.corto}</abbr>
                </th>
              ))}
              <th scope="col" className="col-racha">
                Últimos 5
              </th>
            </tr>
          </thead>
          <tbody>
            {tabla.map((f, i) => (
              <tr
                key={f.equipo.id}
                className={[i < LUGARES_LIGUILLA && 'zona-liguilla', i === LUGARES_LIGUILLA - 1 && 'corte-liguilla']
                  .filter(Boolean)
                  .join(' ')}
              >
                <td className="col-lugar">{i + 1}</td>
                <th scope="row" className="col-equipo">
                  <span className="equipo-celda">
                    <Escudo equipo={f.equipo} chico />
                    <span>{f.equipo.nombre}</span>
                  </span>
                </th>
                {COLUMNAS.map((c) => (
                  <td key={c.clave} className={c.clave === 'puntos' ? 'col-pts' : undefined}>
                    {c.clave === 'diferencia' && f.diferencia > 0 ? `+${f.diferencia}` : f[c.clave]}
                  </td>
                ))}
                <td className="col-racha">
                  <Racha resultados={f.racha} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="leyenda">
        <p>
          <span className="muestra-liguilla" aria-hidden="true" /> Lugares 1 a {LUGARES_LIGUILLA}: van a la liguilla.
        </p>
        <p>J juegos · G ganados · E empatados · P perdidos · PF puntos a favor · PC puntos en contra · Dif diferencia · Pts puntos.</p>
        <p>
          Empate en puntos: diferencia de goles, goles a favor, resultado entre ellos, goles como visitante, juego limpio y
          sorteo.
        </p>
      </div>
    </>
  )
}
