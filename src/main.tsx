import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { liga } from './data'
import { nombreLiga } from './lib/formato'
import './styles.css'

function aplicarMarca() {
  const raiz = document.documentElement.style
  const { colores } = liga
  raiz.setProperty('--color-primario', colores.primario)
  raiz.setProperty('--color-texto-sobre-primario', colores.textoSobrePrimario)
  raiz.setProperty('--color-acento', colores.acento)
  raiz.setProperty('--color-fondo', colores.fondo)
  raiz.setProperty('--color-superficie', colores.superficie)
  raiz.setProperty('--color-texto', colores.texto)
  raiz.setProperty('--color-texto-suave', colores.textoSuave)
  document.title = nombreLiga(liga)
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', colores.primario)
}

aplicarMarca()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
