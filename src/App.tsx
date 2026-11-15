import { lazy, Suspense, useEffect, useState } from 'react'
import { Encabezado } from './components/Encabezado'
import { NavSecciones } from './components/NavSecciones'
import { PiePagina } from './components/PiePagina'
import { ProveedorTorneo } from './lib/contexto'
import { ProveedorEnVivo } from './lib/envivo'
import { seVe, useConfigSitio, type ConfigSitio } from './lib/sitio'
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
  const cargaConfig = useConfigSitio()
  const [inicio] = useState(leerUrl)
  const [torneoId, setTorneoId] = useState(inicio.torneoId)
  const [elegida, setSeccion] = useState<Seccion>(inicio.seccion)
  // Mientras llega la configuración no se muestra nada, para no enseñar por un instante lo que el administrador ocultó.
  const config: ConfigSitio | null = cargaConfig.estado === 'listo' ? cargaConfig.config : null
  const torneos = carga.estado === 'listo' && config ? carga.torneos : []
  const torneo = torneos.find((t) => t.id === torneoId) ?? torneos[0]
  const tardando = useTardando(carga.estado === 'cargando' || !config)
  const secciones = config ? SECCIONES.filter((s) => seVe(config, s.id)) : []
  // Si la sección del enlace está oculta, se abre la primera visible.
  const seccion = secciones.find((s) => s.id === elegida)?.id ?? secciones[0]?.id ?? 'partidos'

  // La URL guarda el torneo y la sección, así un enlace compartido abre lo mismo.
  useEffect(() => {
    if (!torneo) return
    const q = new URLSearchParams({ torneo: torneo.id, ver: seccion })
    window.history.replaceState(null, '', `${window.location.pathname}?${q}`)
  }, [torneo?.id, seccion])

  if (!torneo) {
    const mensaje =
      carga.estado === 'cargando' || !config
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
        <PiePagina acceso={!config || seVe(config, 'acceso')} />
      </>
    )
  }

  if (!secciones.length) {
    return (
      <ProveedorTorneo torneo={torneo}>
        <Encabezado torneos={torneos} actual={torneo} onCambiar={setTorneoId} />
        <main className="contenido">
          <p className="vacio" role="status">
            Por ahora la liga no tiene información publicada en el sitio.
          </p>
        </main>
        <PiePagina acceso={seVe(config!, 'acceso')} />
      </ProveedorTorneo>
    )
  }

  return (
    <ProveedorTorneo torneo={torneo}>
      <ProveedorEnVivo torneoId={torneo.estado === 'terminado' ? undefined : torneo.id}>
      <Encabezado torneos={torneos} actual={torneo} onCambiar={setTorneoId} />
      {secciones.length > 1 && <NavSecciones secciones={secciones} actual={seccion} onCambiar={setSeccion} />}
      {/* La clave reinicia filtros y jornada al cambiar de torneo. */}
      <main className="contenido" key={torneo.id}>
        {seccion === 'partidos' && <PaginaPartidos />}
        {seccion === 'clasificacion' && <PaginaClasificacion config={config!} />}
        {seccion === 'estadisticas' && <PaginaEstadisticas config={config!} />}
      </main>
      <PiePagina acceso={seVe(config!, 'acceso')} />
      </ProveedorEnVivo>
    </ProveedorTorneo>
  )
}
