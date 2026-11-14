import { useMemo } from 'react'
import { Escudo } from '../components/Escudo'
import { useTorneo } from '../lib/contexto'
import { useCapturas } from '../lib/delegados'
import { armarLlaves, CLASIFICADOS, partidosDeRonda, RONDAS, siguientePaso, type Llave, type Sembrado } from '../lib/liguilla'
import { estaPublicado } from '../lib/partidos'
import { modificarTorneo } from '../lib/repositorio'
import { calcularTabla } from '../lib/tabla'
import type { Captura, Ronda } from '../types'
import { TarjetaPartidoAdmin } from './SeccionPartidos'
import { useGuardado } from './useGuardado'
import { nuevoId } from './utilidades'

const nombreRonda = (r: Ronda) => RONDAS.find((x) => x.id === r)!.nombre

/** Liguilla en el panel: generar cada ronda, capturar sus partidos y cerrar el torneo con el campeón (RF-020, RN-004, RN-005, RN-015). */
export function SeccionLiguilla() {
  const { torneo } = useTorneo()
  const tabla = useMemo(() => calcularTabla(torneo), [torneo])
  const llaves = useMemo(() => armarLlaves(torneo, tabla), [torneo, tabla])
  const paso = siguientePaso(torneo, tabla, llaves)
  const capturas = useCapturas(torneo.id) ?? []
  const { guardar, guardando, aviso } = useGuardado()
  const rondas = RONDAS.filter((r) => llaves.some((l) => l.ronda === r.id))
  const ultima = rondas.at(-1)?.id
  const ultimaSinJugar =
    ultima && !torneo.partidos.some((p) => p.fase === 'liguilla' && p.ronda === ultima && (estaPublicado(p) || p.eventos.length > 0))

  function generar() {
    if (paso.tipo !== 'generar') return
    if (
      paso.pendientes > 0 &&
      !window.confirm(
        `Faltan ${paso.pendientes} partidos de la fase regular sin resultado; si se publican después, la tabla puede cambiar y los cruces no se ajustan solos. ¿Generar los cuartos de todos modos?`,
      )
    )
      return
    guardar(
      () =>
        modificarTorneo(torneo.id, (t) => ({
          partidos: [...t.partidos, ...partidosDeRonda(paso.ronda, paso.cruces, () => nuevoId('pa'))],
          ...(paso.ronda === 'cuartos' && t.estado === 'regular' && { estado: 'liguilla' as const }),
        })),
      `${nombreRonda(paso.ronda)} generados`,
    )
  }

  function borrarUltima() {
    if (!ultima || !window.confirm(`¿Borrar los partidos de ${nombreRonda(ultima).toLowerCase()}? Ninguno tiene resultado todavía.`)) return
    guardar(
      () =>
        modificarTorneo(torneo.id, (t) => ({
          partidos: t.partidos.filter((p) => !(p.fase === 'liguilla' && p.ronda === ultima)),
          // Sin cuartos, el torneo vuelve a la fase regular.
          ...(ultima === 'cuartos' && t.estado === 'liguilla' && { estado: 'regular' as const }),
        })),
      `${nombreRonda(ultima)} borrados`,
    )
  }

  function terminar() {
    if (!window.confirm('¿Marcar el torneo como terminado? Las suspensiones pendientes se eliminan y el torneo queda como histórico.')) return
    guardar(() => modificarTorneo(torneo.id, () => ({ estado: 'terminado' })), 'Torneo terminado')
  }

  return (
    <>
      {rondas.map((r) => (
        <section key={r.id} className="bloque">
          <h2 className="titulo-seccion">{r.nombre}</h2>
          <div className="llaves-admin">
            {llaves
              .filter((l) => l.ronda === r.id)
              .map((l) => (
                <LlaveAdmin key={l.numero} llave={l} capturas={capturas} />
              ))}
          </div>
        </section>
      ))}

      <section className="bloque">
        {aviso}
        {paso.tipo === 'imposible' && <p className="vacio">{paso.motivo}</p>}
        {paso.tipo === 'generar' && (
          <div className="tarjeta formulario">
            <h3 className="formulario-titulo">
              {paso.ronda === 'cuartos' ? `Liguilla con los ${CLASIFICADOS} primeros de la tabla` : `Siguiente ronda: ${nombreRonda(paso.ronda)}`}
            </h3>
            <ul className="cruces">
              {paso.cruces.map(([alto, bajo]) => (
                <li key={alto.equipo.id}>
                  <Equipo s={alto} /> <span className="nota">vs</span> <Equipo s={bajo} />
                </li>
              ))}
            </ul>
            <p className="nota">
              {paso.ronda === 'cuartos'
                ? 'Cruces 1-8, 2-7, 3-6 y 4-5.'
                : 'Los ganadores se reacomodan por su lugar en la tabla: el mejor contra el peor.'}{' '}
              {paso.ronda === 'final'
                ? 'Si el global empata, hay tiempo extra y penales.'
                : 'Si el global empata, avanza el mejor colocado.'}{' '}
              La ida se juega en casa del peor colocado y la vuelta en casa del mejor. La fecha y la cancha se ponen después en cada partido.
            </p>
            {paso.pendientes > 0 && (
              <p className="mensaje mensaje-info">Faltan {paso.pendientes} partidos de la fase regular sin resultado; la tabla todavía puede cambiar.</p>
            )}
            <div className="acciones">
              <button type="button" className="boton" onClick={generar} disabled={guardando}>
                Generar {nombreRonda(paso.ronda).toLowerCase()}
              </button>
            </div>
          </div>
        )}
        {paso.tipo === 'esperar' && (
          <p className="nota">
            {paso.faltan === 1 ? 'Falta definir 1 llave' : `Faltan definir ${paso.faltan} llaves`} de {nombreRonda(paso.ronda).toLowerCase()}. Cuando se
            publiquen la ida y la vuelta, aquí aparecerá la siguiente ronda.
          </p>
        )}
        {paso.tipo === 'campeon' && (
          <div className="tarjeta formulario campeon-admin">
            <h3 className="formulario-titulo">
              🏆 Campeón: <Equipo s={paso.campeon} />
            </h3>
            {torneo.estado !== 'terminado' ? (
              <div className="acciones">
                <button type="button" className="boton" onClick={terminar} disabled={guardando}>
                  Terminar torneo
                </button>
              </div>
            ) : (
              <p className="nota">El torneo ya está terminado.</p>
            )}
          </div>
        )}
        {ultimaSinJugar && torneo.estado !== 'terminado' && (
          <button type="button" className="boton boton-chico boton-peligro-texto" onClick={borrarUltima} disabled={guardando}>
            Borrar {nombreRonda(ultima!).toLowerCase()}
          </button>
        )}
      </section>
    </>
  )
}

function Equipo({ s }: { s: Sembrado }) {
  return (
    <span className="equipo-sembrado">
      <Escudo equipo={s.equipo} chico />
      <strong>{s.equipo.nombre}</strong>
      <span className="nota">({s.lugar}.º)</span>
    </span>
  )
}

function LlaveAdmin({ llave, capturas }: { llave: Llave; capturas: Captura[] }) {
  let estado = 'Por jugarse'
  if (llave.global) estado = `Global ${llave.global.alto}-${llave.global.bajo}`
  if (llave.ganador) {
    const como = llave.desempate === 'posicion' ? ' por mejor posición' : llave.desempate === 'penales' ? ` en penales ${llave.penales!.alto}-${llave.penales!.bajo}` : ''
    estado += ` · avanza ${llave.ganador.equipo.nombre}${como}`
  } else if (llave.global && llave.ronda === 'final') {
    estado += ' · falta capturar los penales en la vuelta'
  }
  return (
    <div className="llave-admin">
      <p className="llave-admin-titulo">
        <strong>
          Llave {llave.numero}: {llave.alto.equipo.nombre} ({llave.alto.lugar}.º) vs {llave.bajo.equipo.nombre} ({llave.bajo.lugar}.º)
        </strong>
        <span className="nota">{estado}</span>
      </p>
      <div className="lista-admin">
        {[llave.ida, llave.vuelta].map(
          (p) => p && <TarjetaPartidoAdmin key={p.id} partido={p} capturas={capturas.filter((c) => c.partidoId === p.id)} />,
        )}
      </div>
    </div>
  )
}
