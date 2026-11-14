import { useState } from 'react'
import { Avatar } from '../components/Avatar'
import { Escudo } from '../components/Escudo'
import { Racha } from '../components/Racha'
import { Segmentado } from '../components/Segmentado'
import { useTorneo } from '../lib/contexto'
import {
  asistencias,
  estadisticasPorEquipo,
  goleadores,
  suspendidos,
  tarjetasPorEquipo,
  tarjetasPorJugador,
  type FiltroFase,
  type FilaJugador,
} from '../lib/estadisticas'
import { fechaSinHora } from '../lib/formato'
import { seVe, type ConfigSitio } from '../lib/sitio'

type Apartado = 'goleadores' | 'asistencias' | 'tarjetas' | 'equipos' | 'disciplina'

const APARTADOS: { id: Apartado; nombre: string }[] = [
  { id: 'goleadores', nombre: 'Goleadores' },
  { id: 'asistencias', nombre: 'Asistencias' },
  { id: 'tarjetas', nombre: 'Tarjetas' },
  { id: 'equipos', nombre: 'Equipos' },
  { id: 'disciplina', nombre: 'Suspendidos y sanciones' },
]

const FILTROS: { id: FiltroFase; nombre: string }[] = [
  { id: 'regular', nombre: 'Fase regular' },
  { id: 'liguilla', nombre: 'Liguilla' },
  { id: 'todo', nombre: 'Todo el torneo' },
]

/** Cuántas filas se ven antes de "Ver todos". */
const FILAS_VISIBLES = 10

export function PaginaEstadisticas({ config }: { config: ConfigSitio }) {
  const { torneo } = useTorneo()
  const hayLiguilla = torneo.partidos.some((p) => p.fase === 'liguilla')
  const apartados = APARTADOS.filter((a) => seVe(config, `estadisticas.${a.id}`))
  const [elegido, setApartado] = useState<Apartado>('goleadores')
  const apartado = apartados.find((a) => a.id === elegido)?.id ?? apartados[0]?.id ?? 'goleadores'
  const [filtro, setFiltro] = useState<FiltroFase>('regular')
  return (
    <>
      {apartados.length > 1 && (
        <Segmentado etiqueta="Estadística" opciones={apartados} valor={apartado} onCambiar={setApartado} ajustable />
      )}
      {hayLiguilla && apartado !== 'disciplina' && (
        <Segmentado etiqueta="Fase" opciones={FILTROS} valor={filtro} onCambiar={setFiltro} />
      )}
      {apartado === 'goleadores' && <Ranking filas={goleadores(torneo, filtro)} unidad="goles" />}
      {apartado === 'asistencias' && <Ranking filas={asistencias(torneo, filtro)} unidad="asistencias" />}
      {apartado === 'tarjetas' && <Tarjetas filtro={filtro} />}
      {apartado === 'equipos' && <Equipos filtro={filtro} />}
      {apartado === 'disciplina' && <Disciplina />}
    </>
  )
}

function Ranking({ filas, unidad }: { filas: FilaJugador[]; unidad: string }) {
  const { equipo } = useTorneo()
  const [todos, setTodos] = useState(false)
  if (!filas.length) return <p className="vacio">Todavía no hay {unidad} en esta fase.</p>
  return (
    // Como el widget de Liga MX de Bing: Jugador (avatar y nombre) · Equipo (escudo y nombre) · total.
    <div className="tarjeta">
      <table className="tabla-jugadores">
        <thead>
          <tr>
            <th scope="col">Jugador</th>
            <th scope="col">Equipo</th>
            <th scope="col" className="tabla-jugadores-valor">
              {unidad[0].toUpperCase() + unidad.slice(1)}
            </th>
          </tr>
        </thead>
        <tbody>
          {(todos ? filas : filas.slice(0, FILAS_VISIBLES)).map((f) => {
            const eq = equipo(f.jugador.equipoId)
            return (
              <tr key={f.jugador.id}>
                <td>
                  <span className="tabla-jugadores-celda">
                    <Avatar nombre={f.jugador.nombre} color={eq?.color} />
                    <span className="tabla-jugadores-nombre">{f.jugador.nombre}</span>
                  </span>
                </td>
                <td>
                  {eq && (
                    <span className="tabla-jugadores-celda" title={eq.nombre}>
                      <Escudo equipo={eq} chico />
                      <span className="tabla-jugadores-equipo">{eq.nombre}</span>
                    </span>
                  )}
                </td>
                <td className="tabla-jugadores-valor">{f.valor}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <VerTodos total={filas.length} todos={todos} onCambiar={setTodos} />
    </div>
  )
}

function VerTodos({ total, todos, onCambiar }: { total: number; todos: boolean; onCambiar: (todos: boolean) => void }) {
  if (total <= FILAS_VISIBLES) return null
  return (
    <button type="button" className="boton-texto" onClick={() => onCambiar(!todos)}>
      {todos ? 'Ver menos' : `Ver todos (${total})`}
    </button>
  )
}

function IconoTarjeta({ color }: { color: 'amarilla' | 'roja' }) {
  return <span className={`icono-tarjeta icono-${color}`} role="img" aria-label={color === 'amarilla' ? 'Amarillas' : 'Rojas'} />
}

function Tarjetas({ filtro }: { filtro: FiltroFase }) {
  const { torneo, equipo } = useTorneo()
  const [por, setPor] = useState<'jugador' | 'equipo'>('jugador')
  const [todos, setTodos] = useState(false)
  const filas =
    por === 'jugador'
      ? tarjetasPorJugador(torneo, filtro).map((f) => ({ id: f.jugador.id, equipo: equipo(f.jugador.equipoId), nombre: f.jugador.nombre, ...f }))
      : tarjetasPorEquipo(torneo, filtro).map((f) => ({ id: f.equipo.id, nombre: f.equipo.nombre, ...f }))
  return (
    <>
      <Segmentado
        etiqueta="Agrupar"
        opciones={[
          { id: 'jugador', nombre: 'Por jugador' },
          { id: 'equipo', nombre: 'Por equipo' },
        ]}
        valor={por}
        onCambiar={setPor}
      />
      {filas.length ? (
        <div className="tarjeta tabla-envoltura">
          <table className="tabla tabla-simple">
            <thead>
              <tr>
                <th scope="col" className="col-equipo">
                  {por === 'jugador' ? 'Jugador' : 'Equipo'}
                </th>
                <th scope="col">
                  <IconoTarjeta color="amarilla" />
                </th>
                <th scope="col">
                  <IconoTarjeta color="roja" />
                </th>
              </tr>
            </thead>
            <tbody>
              {(todos ? filas : filas.slice(0, FILAS_VISIBLES)).map((f) => (
                <tr key={f.id}>
                  <th scope="row" className="col-equipo">
                    <span className="equipo-celda">
                      <Escudo equipo={f.equipo} chico />
                      <span>{f.nombre}</span>
                    </span>
                  </th>
                  <td>{f.amarillas}</td>
                  <td>{f.rojas}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <VerTodos total={filas.length} todos={todos} onCambiar={setTodos} />
        </div>
      ) : (
        <p className="vacio">Todavía no hay tarjetas en esta fase.</p>
      )}
      <p className="leyenda">La doble amarilla cuenta como 1 amarilla y 1 roja.</p>
    </>
  )
}

function Equipos({ filtro }: { filtro: FiltroFase }) {
  const { torneo } = useTorneo()
  const filas = estadisticasPorEquipo(torneo, filtro)
  if (!filas.length) return <p className="vacio">Todavía no hay partidos en esta fase.</p>
  return (
    <>
      <div className="tarjeta tabla-envoltura">
        <table className="tabla">
          <thead>
            <tr>
              <th scope="col" className="col-equipo">
                Equipo
              </th>
              <th scope="col">
                <abbr title="Juegos">J</abbr>
              </th>
              <th scope="col">
                <abbr title="Puntos a favor">PF</abbr>
              </th>
              <th scope="col">
                <abbr title="Puntos en contra">PC</abbr>
              </th>
              <th scope="col">
                <abbr title="Diferencia">Dif</abbr>
              </th>
              <th scope="col">
                <abbr title="Partidos sin recibir gol">SG</abbr>
              </th>
              <th scope="col">
                <IconoTarjeta color="amarilla" />
              </th>
              <th scope="col">
                <IconoTarjeta color="roja" />
              </th>
              <th scope="col" className="col-racha">
                Últimos 5
              </th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr key={f.equipo.id}>
                <th scope="row" className="col-equipo">
                  <span className="equipo-celda">
                    <Escudo equipo={f.equipo} chico />
                    <span>{f.equipo.nombre}</span>
                  </span>
                </th>
                <td>{f.juegos}</td>
                <td>{f.aFavor}</td>
                <td>{f.enContra}</td>
                <td>{f.diferencia > 0 ? `+${f.diferencia}` : f.diferencia}</td>
                <td>{f.sinRecibir}</td>
                <td>{f.amarillas}</td>
                <td>{f.rojas}</td>
                <td className="col-racha">
                  <Racha resultados={f.racha} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="leyenda">SG: partidos sin recibir gol. Ordenados por goles a favor.</p>
    </>
  )
}

function Disciplina() {
  const { torneo, equipo } = useTorneo()
  const lista = suspendidos(torneo)
  return (
    <>
      <section className="bloque">
        <h2 className="titulo-seccion">
          Suspendidos <small>no pueden jugar la próxima jornada</small>
        </h2>
        {torneo.estado === 'terminado' ? (
          <p className="vacio">El torneo terminó; las suspensiones pendientes se eliminaron.</p>
        ) : lista.length ? (
          <div className="tarjeta">
            <ul className="ranking">
              {lista.map((s) => {
                const eq = equipo(s.jugador.equipoId)
                return (
                  <li key={s.jugador.id}>
                    <IconoTarjeta color="roja" />
                    <Escudo equipo={eq} chico />
                    <span className="ranking-quien">
                      <strong>{s.jugador.nombre}</strong>
                      <span>
                        {eq.nombre} · {s.motivo}
                      </span>
                    </span>
                    <span className="ranking-texto">
                      Le {s.faltan === 1 ? 'falta 1 partido' : `faltan ${s.faltan} partidos`}
                    </span>
                  </li>
                )
              })}
            </ul>
          </div>
        ) : (
          <p className="vacio">Nadie está suspendido.</p>
        )}
      </section>
      <section className="bloque">
        <h2 className="titulo-seccion">Sanciones</h2>
        {torneo.sanciones.length ? (
          <div className="tarjeta">
            <ul className="ranking">
              {torneo.sanciones.map((s, i) => {
                const eq = equipo(s.equipoId)
                return (
                  <li key={i}>
                    <span className="ranking-lugar" aria-hidden="true">
                      !
                    </span>
                    <Escudo equipo={eq} chico />
                    <span className="ranking-quien">
                      <strong>{eq.nombre}</strong>
                      <span>{s.descripcion}</span>
                    </span>
                    <span className="ranking-texto">{fechaSinHora(s.fecha)}</span>
                  </li>
                )
              })}
            </ul>
          </div>
        ) : (
          <p className="vacio">No hay sanciones registradas.</p>
        )}
      </section>
    </>
  )
}
