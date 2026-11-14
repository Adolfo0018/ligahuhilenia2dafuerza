import { useMemo, useState } from 'react'
import { CuadroLiguilla, ProyeccionLiguilla } from '../components/CuadroLiguilla'
import { Segmentado } from '../components/Segmentado'
import { TablaGeneral } from '../components/TablaGeneral'
import { useTorneo } from '../lib/contexto'
import { armarLlaves } from '../lib/liguilla'
import { seVe, type ConfigSitio } from '../lib/sitio'
import { calcularTabla } from '../lib/tabla'

type Vista = 'tabla' | 'liguilla'

const VISTAS: { id: Vista; nombre: string }[] = [
  { id: 'tabla', nombre: 'Tabla general' },
  { id: 'liguilla', nombre: 'Liguilla' },
]

export function PaginaClasificacion({ config }: { config: ConfigSitio }) {
  const { torneo } = useTorneo()
  const tabla = useMemo(() => calcularTabla(torneo), [torneo])
  const llaves = useMemo(() => armarLlaves(torneo, tabla), [torneo, tabla])
  const [elegida, setVista] = useState<Vista>(llaves.length && torneo.estado !== 'regular' ? 'liguilla' : 'tabla')
  const vistas = VISTAS.filter((v) => seVe(config, `clasificacion.${v.id}`))
  const vista = vistas.find((v) => v.id === elegida)?.id ?? vistas[0]?.id ?? 'tabla'
  return (
    <>
      {vistas.length > 1 && <Segmentado etiqueta="Vista" opciones={vistas} valor={vista} onCambiar={setVista} />}
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
