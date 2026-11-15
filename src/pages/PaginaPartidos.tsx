import { useEffect, useRef, useState } from 'react'
import { AnunciosRegulares, PatrocinadorOficial } from '../components/Publicidad'
import { Segmentado } from '../components/Segmentado'
import { TarjetaPartido } from '../components/TarjetaPartido'
import { useTorneo } from '../lib/contexto'
import { useEnVivoTorneo } from '../lib/envivo'
import { RONDAS } from '../lib/liguilla'
import { jornadaActual, porFecha } from '../lib/partidos'
import { publicidadDeJornada } from '../lib/publicidad'

type Vista = 'regular' | 'liguilla'

export function PaginaPartidos() {
  const { torneo } = useTorneo()
  const hayLiguilla = torneo.partidos.some((p) => p.fase === 'liguilla')
  const [vista, setVista] = useState<Vista>(hayLiguilla && torneo.estado !== 'regular' ? 'liguilla' : 'regular')
  return (
    <>
      {hayLiguilla && (
        <Segmentado
          etiqueta="Fase"
          opciones={[
            { id: 'regular', nombre: 'Fase regular' },
            { id: 'liguilla', nombre: 'Liguilla' },
          ]}
          valor={vista}
          onCambiar={setVista}
        />
      )}
      {vista === 'regular' ? <FaseRegular /> : <Liguilla />}
    </>
  )
}

function FaseRegular() {
  const { torneo } = useTorneo()
  const regulares = torneo.partidos.filter((p) => p.fase === 'regular')
  const total = Math.max(1, ...regulares.map((p) => p.jornada ?? 1))
  const [jornada, setJornada] = useState(() => jornadaActual(torneo))
  const lista = useRef<HTMLDivElement>(null)
  // Si hay un partido en vivo, se abre su jornada (una sola vez, al llegar el marcador).
  const vivos = useEnVivoTorneo()
  const saltoAlVivo = useRef(false)
  const jornadaVivo = regulares.find((p) => vivos.some((v) => v.partidoId === p.id && v.estado !== 'final'))?.jornada
  useEffect(() => {
    if (jornadaVivo && !saltoAlVivo.current) {
      saltoAlVivo.current = true
      setJornada(jornadaVivo)
    }
  }, [jornadaVivo])

  // Mantiene a la vista la jornada elegida cuando las jornadas no caben en la pantalla.
  useEffect(() => {
    lista.current?.querySelector('[aria-pressed="true"]')?.scrollIntoView({ inline: 'center', block: 'nearest' })
  }, [jornada])

  if (!regulares.length) return <p className="vacio">Todavía no hay partidos programados en este torneo.</p>

  const partidos = regulares.filter((p) => p.jornada === jornada).sort(porFecha)
  const juegan = new Set(partidos.flatMap((p) => [p.localId, p.visitanteId]))
  const descansan = torneo.equipos.filter((e) => !juegan.has(e.id))
  // Viene en el mismo documento del torneo: no hace ninguna lectura más.
  const publicidad = publicidadDeJornada(torneo, jornada)

  return (
    <>
      <div className="jornadas">
        <button type="button" className="flecha" aria-label="Jornada anterior" disabled={jornada <= 1} onClick={() => setJornada(jornada - 1)}>
          ‹
        </button>
        <div className="jornadas-lista" ref={lista} role="group" aria-label="Jornadas">
          {Array.from({ length: total }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              type="button"
              className="jornada-chip"
              aria-pressed={n === jornada}
              aria-label={`Jornada ${n}`}
              onClick={() => setJornada(n)}
            >
              J{n}
            </button>
          ))}
        </div>
        <button type="button" className="flecha" aria-label="Jornada siguiente" disabled={jornada >= total} onClick={() => setJornada(jornada + 1)}>
          ›
        </button>
      </div>
      <h2 className="titulo-seccion">
        Jornada {jornada} <small>de {total}</small>
      </h2>
      {publicidad.oficial && <PatrocinadorOficial anuncio={publicidad.oficial} />}
      <div className="lista-partidos">
        {partidos.map((p) => (
          <TarjetaPartido key={p.id} partido={p} />
        ))}
      </div>
      {descansan.length > 0 && <p className="nota-descanso">Descansa: {descansan.map((e) => e.nombre).join(', ')}</p>}
      <AnunciosRegulares anuncios={publicidad.regulares} />
    </>
  )
}

function Liguilla() {
  const { torneo } = useTorneo()
  return (
    <>
      {RONDAS.map((r) => {
        const partidos = torneo.partidos.filter((p) => p.ronda === r.id).sort(porFecha)
        if (!partidos.length) return null
        return (
          <section key={r.id} className="bloque">
            <h2 className="titulo-seccion">{r.nombre}</h2>
            <div className="lista-partidos">
              {partidos.map((p) => (
                <TarjetaPartido key={p.id} partido={p} etiqueta={p.vuelta === 'ida' ? 'Ida' : 'Vuelta'} />
              ))}
            </div>
          </section>
        )
      })}
    </>
  )
}
