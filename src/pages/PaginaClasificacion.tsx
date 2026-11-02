import { useMemo, useState } from 'react'
import { CuadroLiguilla, ProyeccionLiguilla } from '../components/CuadroLiguilla'
import { Segmentado } from '../components/Segmentado'
import { TablaGeneral } from '../components/TablaGeneral'
import { useTorneo } from '../lib/contexto'
import { armarLlaves } from '../lib/liguilla'
import { calcularTabla } from '../lib/tabla'

type Vista = 'tabla' | 'liguilla'

export function PaginaClasificacion() {
  const { torneo } = useTorneo()
  const tabla = useMemo(() => calcularTabla(torneo), [torneo])
  const llaves = useMemo(() => armarLlaves(torneo, tabla), [torneo, tabla])
  const [vista, setVista] = useState<Vista>(llaves.length && torneo.estado !== 'regular' ? 'liguilla' : 'tabla')
  return (
    <>
      <Segmentado
        etiqueta="Vista"
        opciones={[
          { id: 'tabla', nombre: 'Tabla general' },
          { id: 'liguilla', nombre: 'Liguilla' },
        ]}
        valor={vista}
        onCambiar={setVista}
      />
      {vista === 'tabla' ? (
        <TablaGeneral tabla={tabla} />
      ) : llaves.length ? (
        <CuadroLiguilla llaves={llaves} />
      ) : (
        <ProyeccionLiguilla tabla={tabla} />
      )}
    </>
  )
}
