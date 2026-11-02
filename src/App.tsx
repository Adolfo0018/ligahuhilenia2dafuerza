import { useEffect, useState } from 'react'
import { Encabezado } from './components/Encabezado'
import { NavSecciones } from './components/NavSecciones'
import { PiePagina } from './components/PiePagina'
import { torneos } from './data'
import { ProveedorTorneo } from './lib/contexto'
import { PaginaClasificacion } from './pages/PaginaClasificacion'
import { PaginaEstadisticas } from './pages/PaginaEstadisticas'
import { PaginaPartidos } from './pages/PaginaPartidos'

type Seccion = 'partidos' | 'clasificacion' | 'estadisticas'

const SECCIONES: { id: Seccion; nombre: string }[] = [
  { id: 'partidos', nombre: 'Partidos' },
  { id: 'clasificacion', nombre: 'Clasificación' },
  { id: 'estadisticas', nombre: 'Estadísticas' },
]

function leerUrl() {
  const q = new URLSearchParams(window.location.search)
  return {
    torneoId: (torneos.find((t) => t.id === q.get('torneo')) ?? torneos[0]).id,
    seccion: SECCIONES.find((s) => s.id === q.get('ver'))?.id ?? 'partidos',
  }
}

export default function App() {
  const [inicio] = useState(leerUrl)
  const [torneoId, setTorneoId] = useState(inicio.torneoId)
  const [seccion, setSeccion] = useState<Seccion>(inicio.seccion)
  const torneo = torneos.find((t) => t.id === torneoId)!

  // La URL guarda el torneo y la sección, así un enlace compartido abre lo mismo.
  useEffect(() => {
    const q = new URLSearchParams({ torneo: torneoId, ver: seccion })
    window.history.replaceState(null, '', `${window.location.pathname}?${q}`)
  }, [torneoId, seccion])

  return (
    <ProveedorTorneo torneo={torneo}>
      <Encabezado torneos={torneos} actual={torneo} onCambiar={setTorneoId} />
      <NavSecciones secciones={SECCIONES} actual={seccion} onCambiar={setSeccion} />
      {/* La clave reinicia filtros y jornada al cambiar de torneo. */}
      <main className="contenido" key={torneo.id}>
        {seccion === 'partidos' && <PaginaPartidos />}
        {seccion === 'clasificacion' && <PaginaClasificacion />}
        {seccion === 'estadisticas' && <PaginaEstadisticas />}
      </main>
      <PiePagina />
    </ProveedorTorneo>
  )
}
