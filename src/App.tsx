import { lazy, Suspense, useEffect, useState } from 'react'
import { Encabezado } from './components/Encabezado'
import { NavSecciones } from './components/NavSecciones'
import { PiePagina } from './components/PiePagina'
import { ProveedorTorneo } from './lib/contexto'
import { useTorneos } from './lib/torneos'
import { PaginaClasificacion } from './pages/PaginaClasificacion'
import { PaginaEstadisticas } from './pages/PaginaEstadisticas'
import { PaginaPartidos } from './pages/PaginaPartidos'

// El panel (con Authentication) se descarga solo al abrir /admin.
const PaginaAdmin = lazy(() => import('./admin/PaginaAdmin').then((m) => ({ default: m.PaginaAdmin })))

type Seccion = 'partidos' | 'clasificacion' | 'estadisticas'

const SECCIONES: { id: Seccion; nombre: string }[] = [
  { id: 'partidos', nombre: 'Partidos' },
  { id: 'clasificacion', nombre: 'Clasificación' },
  { id: 'estadisticas', nombre: 'Estadísticas' },
]

function leerUrl() {
  const q = new URLSearchParams(window.location.search)
  return {
    torneoId: q.get('torneo') ?? '',
    seccion: SECCIONES.find((s) => s.id === q.get('ver'))?.id ?? 'partidos',
  }
}

export default function App() {
  const ruta = window.location.pathname.replace(/\/+$/, '')
  if (ruta === '/admin') {
    return (
      <Suspense fallback={null}>
        <PaginaAdmin />
      </Suspense>
    )
  }
  return <SitioPublico />
}

/** Sin conexión, Firestore reintenta sin avisar; después de unos segundos se le explica al visitante. */
function useTardando(cargando: boolean): boolean {
  const [tardando, setTardando] = useState(false)
  useEffect(() => {
    if (!cargando) return
    const temporizador = setTimeout(() => setTardando(true), 8000)
    return () => clearTimeout(temporizador)
  }, [cargando])
  return tardando
}

function SitioPublico() {
  const carga = useTorneos()
  const [inicio] = useState(leerUrl)
  const [torneoId, setTorneoId] = useState(inicio.torneoId)
  const [seccion, setSeccion] = useState<Seccion>(inicio.seccion)
  const torneos = carga.estado === 'listo' ? carga.torneos : []
  const torneo = torneos.find((t) => t.id === torneoId) ?? torneos[0]
  const tardando = useTardando(carga.estado === 'cargando')

  // La URL guarda el torneo y la sección, así un enlace compartido abre lo mismo.
  useEffect(() => {
    if (!torneo) return
    const q = new URLSearchParams({ torneo: torneo.id, ver: seccion })
    window.history.replaceState(null, '', `${window.location.pathname}?${q}`)
  }, [torneo?.id, seccion])

  if (!torneo) {
    const mensaje =
      carga.estado === 'cargando'
        ? tardando
          ? 'Está tardando más de lo normal. Revisa tu conexión; la información aparecerá en cuanto se conecte.'
          : 'Cargando la información de la liga…'
        : carga.estado === 'error'
          ? 'No se pudo cargar la información. Revisa tu conexión e intenta de nuevo.'
          : 'La liga todavía no publica ningún torneo.'
    return (
      <>
        <Encabezado torneos={[]} onCambiar={setTorneoId} />
        <main className="contenido">
          <p className="vacio" role="status">
            {mensaje}
          </p>
        </main>
        <PiePagina />
      </>
    )
  }

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
