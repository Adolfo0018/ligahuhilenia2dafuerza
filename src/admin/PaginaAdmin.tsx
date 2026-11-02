import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { liga } from '../data'
import { db, firebaseConfigurado } from '../lib/firebase'
import { iniciales, nombreLiga } from '../lib/formato'
import { auth } from '../lib/sesion'
import './admin.css'
import { Panel } from './Panel'

type Sesion =
  | { estado: 'cargando' }
  | { estado: 'fuera' }
  | { estado: 'sin-acceso'; usuario: User }
  | { estado: 'dentro'; usuario: User }

export function PaginaAdmin() {
  const [sesion, setSesion] = useState<Sesion>({ estado: 'cargando' })

  useEffect(() => {
    document.title = `${nombreLiga(liga)} · Administración`
    if (!auth || !db) return
    const base = db
    return onAuthStateChanged(auth, async (usuario) => {
      if (!usuario) return setSesion({ estado: 'fuera' })
      // Solo entran las cuentas con rol "admin" en la colección "usuarios" (ver README).
      try {
        const ficha = await getDoc(doc(base, 'usuarios', usuario.uid))
        setSesion(ficha.data()?.rol === 'admin' ? { estado: 'dentro', usuario } : { estado: 'sin-acceso', usuario })
      } catch {
        setSesion({ estado: 'sin-acceso', usuario })
      }
    })
  }, [])

  if (!firebaseConfigurado) {
    return (
      <Acceso>
        <h2>Falta conectar Firebase</h2>
        <p className="texto-suave">
          El panel funciona cuando la app está conectada a su proyecto de Firebase (<code>src/lib/firebase.ts</code>).
        </p>
      </Acceso>
    )
  }
  if (sesion.estado === 'cargando') {
    return (
      <Acceso>
        <p className="texto-suave">Cargando…</p>
      </Acceso>
    )
  }
  if (sesion.estado === 'fuera') return <InicioSesion />
  if (sesion.estado === 'sin-acceso') {
    return (
      <Acceso>
        <h2>Sin acceso</h2>
        <p className="texto-suave">
          La cuenta <strong>{sesion.usuario.email}</strong> no está dada de alta como administrador de la liga.
        </p>
        <button type="button" className="boton boton-ancho" onClick={() => auth && signOut(auth)}>
          Usar otra cuenta
        </button>
      </Acceso>
    )
  }
  return <Panel usuario={sesion.usuario} />
}

/** Pantalla centrada con la marca de la liga, para el inicio de sesión y los estados de acceso. */
function Acceso({ children }: { children: ReactNode }) {
  return (
    <main className="acceso">
      <div className="acceso-tarjeta">
        <div className="acceso-marca">
          {liga.logo ? (
            <img className="acceso-logo" src={liga.logo} alt={`Logo de ${liga.nombre}`} />
          ) : (
            <span className="acceso-logo">{iniciales(liga.nombre)}</span>
          )}
          <div>
            <p className="acceso-nombre">{nombreLiga(liga)}</p>
            <p className="texto-suave">Administración</p>
          </div>
        </div>
        {children}
        <a className="acceso-volver" href="/">
          ← Volver al sitio
        </a>
      </div>
    </main>
  )
}

function InicioSesion() {
  const [correo, setCorreo] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [error, setError] = useState('')
  const [entrando, setEntrando] = useState(false)

  async function entrar(e: FormEvent) {
    e.preventDefault()
    if (!auth) return
    setEntrando(true)
    setError('')
    try {
      await signInWithEmailAndPassword(auth, correo.trim(), contrasena)
    } catch {
      setError('Correo o contraseña incorrectos.')
    } finally {
      setEntrando(false)
    }
  }

  return (
    <Acceso>
      <form className="formulario-acceso" onSubmit={entrar}>
        <h2>Iniciar sesión</h2>
        <label className="campo">
          <span>Correo</span>
          <input type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} autoComplete="username" required />
        </label>
        <label className="campo">
          <span>Contraseña</span>
          <input
            type="password"
            value={contrasena}
            onChange={(e) => setContrasena(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
        {error && <p className="mensaje mensaje-error">{error}</p>}
        <button type="submit" className="boton boton-ancho" disabled={entrando}>
          {entrando ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </Acceso>
  )
}
