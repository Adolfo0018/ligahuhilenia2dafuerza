import { useMemo, useState } from 'react'
import { useTorneo } from '../lib/contexto'
import { fechaCorta } from '../lib/formato'
import { modificarTorneo } from '../lib/repositorio'
import { COLUMNAS, exportarCalendario, leerCalendario, planear, type TipoCambio } from './calendario'
import { useGuardado } from './useGuardado'

const ETIQUETAS: Record<TipoCambio, string> = {
  nuevo: 'Nuevo',
  actualiza: 'Cambia',
  igual: 'Sin cambios',
  error: 'Error',
}

const EJEMPLO = `Jornada\tLocal\tVisitante\tFecha\tHora\tCancha\tGoles local\tGoles visitante
5\tDEPORTIVO HOMUN\tAJAX CUZAMA\t15/11/2026\t12:00\tHomun\t\t
4\tZORROS HUHI\tBODKA JR HUHI\t08/11/2026\t13:00\tHuhi\t4\t2`

/** Descarga el calendario actual como CSV para editarlo en Excel o Google Sheets. */
export function descargarCalendario(nombreTorneo: string, contenido: string) {
  const url = URL.createObjectURL(new Blob([contenido], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `calendario-${nombreTorneo.replace(/[^\p{L}\p{N}]+/gu, '-').toLowerCase()}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export function ImportarCalendario({ onListo }: { onListo: () => void }) {
  const { torneo, equipo } = useTorneo()
  const [texto, setTexto] = useState('')
  const { guardar, guardando, aviso } = useGuardado()
  const plan = useMemo(() => (texto.trim() ? planear(torneo, leerCalendario(texto, torneo)) : null), [texto, torneo])
  const cuenta = (tipo: TipoCambio) => plan?.cambios.filter((c) => c.tipo === tipo).length ?? 0
  const porGuardar = cuenta('nuevo') + cuenta('actualiza')

  async function aplicar() {
    // Se vuelve a planear dentro de la transacción, sobre la versión más reciente del torneo.
    const ok = await guardar(
      () => modificarTorneo(torneo.id, (t) => ({ partidos: planear(t, leerCalendario(texto, t)).partidos })),
      `${porGuardar === 1 ? '1 partido guardado' : `${porGuardar} partidos guardados`}`,
    )
    if (ok) setTexto('')
  }

  return (
    <div className="tarjeta formulario">
      <h3 className="formulario-titulo">Pegar calendario</h3>
      <p className="nota">
        Copia las filas desde Excel o Google Sheets y pégalas aquí. Columnas, en este orden: <strong>{COLUMNAS.join(' · ')}</strong>. Solo
        jornada, local y visitante son obligatorias; la primera fila puede traer los títulos. Los partidos que ya existen se actualizan
        (fecha, hora, cancha o resultado) y los que no, se crean. Los resultados se cargan sin goleadores.
      </p>
      <div className="acciones">
        <button
          type="button"
          className="boton boton-chico boton-secundario"
          onClick={() => descargarCalendario(torneo.nombre, exportarCalendario(torneo))}
        >
          Descargar el calendario actual (Excel)
        </button>
        {!texto && (
          <button type="button" className="boton-enlace" onClick={() => setTexto(EJEMPLO)}>
            Ver un ejemplo
          </button>
        )}
      </div>
      <label className="campo">
        <span>Filas del calendario</span>
        <textarea rows={8} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder={COLUMNAS.join('\t')} spellCheck={false} />
      </label>

      {plan && (
        <>
          <ul className="resumen">
            <li>
              <strong>{cuenta('nuevo')}</strong>nuevos
            </li>
            <li>
              <strong>{cuenta('actualiza')}</strong>con cambios
            </li>
            <li>
              <strong>{cuenta('igual')}</strong>sin cambios
            </li>
            <li>
              <strong>{cuenta('error')}</strong>con error (no se guardan)
            </li>
          </ul>
          <div className="tabla-importar-contenedor">
            <table className="tabla-importar">
              <thead>
                <tr>
                  <th>Fila</th>
                  <th>Partido</th>
                  <th>Qué pasa</th>
                </tr>
              </thead>
              <tbody>
                {plan.cambios.map((c) => {
                  const p = c.partidoId ? plan.partidos.find((x) => x.id === c.partidoId) : undefined
                  return (
                    <tr key={c.fila.linea} className={`importar-${c.tipo}`}>
                      <td>{c.fila.linea}</td>
                      <td>
                        <strong>
                          {c.fila.jornada ? `J${c.fila.jornada} · ` : ''}
                          {c.fila.localId ? equipo(c.fila.localId).nombre : c.fila.textoLocal || '¿?'} vs{' '}
                          {c.fila.visitanteId ? equipo(c.fila.visitanteId).nombre : c.fila.textoVisitante || '¿?'}
                        </strong>
                        {p && (
                          <span>
                            {fechaCorta(p.fecha)}
                            {p.cancha && ` · ${p.cancha}`}
                          </span>
                        )}
                      </td>
                      <td>
                        <span className={`insignia importar-insignia-${c.tipo}`}>{ETIQUETAS[c.tipo]}</span> {c.detalle}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
      {aviso}
      <div className="acciones">
        <button type="button" className="boton" onClick={aplicar} disabled={guardando || !porGuardar}>
          {porGuardar ? `Guardar ${porGuardar === 1 ? '1 partido' : `${porGuardar} partidos`}` : 'Guardar'}
        </button>
        <button type="button" className="boton boton-secundario" onClick={onListo}>
          Cerrar
        </button>
      </div>
    </div>
  )
}
