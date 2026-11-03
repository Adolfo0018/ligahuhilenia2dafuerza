import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth'
import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { liga } from '../data'
import { escucharUsuario, solicitarCuenta } from '../lib/delegados'
import { firebaseConfigurado } from '../lib/firebase'
import { iniciales, nombreLiga } from '../lib/formato'
import { auth } from '../lib/sesion'
import { useTorneos } from '../lib/torneos'
import type { Usuario } from '../types'
import './admin.css'
import { Panel } from './Panel'
import { PanelDelegado } from './PanelDelegado'

type Sesion =
  | { estado: 'cargando' }
  | { estado: 'fuera' }
  | { estado: 'dentro'; usuario: User; ficha: Usuario | null }

export function PaginaAdmin() {
  const [sesion, setSesion] = useState<Sesion>({ estado: 'cargando' })

  useEffect(() => {
    document.title = `${nombreLiga(liga)} · Administración`
    if (!auth) return
    let dejarDeEscuchar: (() => void) | undefined
    const dejarSesion = onAuthStateChanged(auth, (usuario) => {
      dejarDeEscuchar?.()
      if (!usuario) return setSesion({ estado: 'fuera' })
      // La ficha en "usuarios" dice qué puede hacer la cuenta (ver README); se escucha en tiempo real
      // para que el delegado entre en cuanto el administrador le asigna su equipo.
      dejarDeEscuchar = escucharUsuario(
        usuario.uid,
        (ficha) => setSesion({ estado: 'dentro', usuario, ficha }),
        () => setSesion({ estado: 'dentro', usuario, ficha: null }),
      )
    })
    return () => {
      dejarSesion()
      dejarDeEscuchar?.()
    }
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

  const { usuario, ficha } = sesion
  if (ficha?.rol === 'admin') return <Panel usuario={usuario} />
  if (ficha?.rol === 'delegado' && ficha.equipoId) return <PanelDelegado usuario={usuario} ficha={ficha} />
  if (!ficha) return <CompletarRegistro usuario={usuario} />
  return (
    <Acceso>
      <h2>Cuenta en revisión</h2>
      <p className="texto-suave">
        Tu cuenta <strong>{usuario.email}</strong> está registrada. En cuanto el administrador de la liga te asigne tu equipo,
        esta pantalla cambia sola a tu panel de delegado.
      </p>
      <button type="button" className="boton boton-secundario boton-ancho" onClick={() => auth && signOut(auth)}>
        Salir
      </button>
    </Acceso>
  )
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
            <p className="texto-suave">Administradores y delegados</p>
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

/** Mensajes de Firebase Authentication en palabras de la liga. */
function mensajeDeError(e: unknown): string {
  const codigo = (e as { code?: string }).code ?? ''
  if (codigo.includes('email-already-in-use')) return 'Ya hay una cuenta con ese correo. Inicia sesión.'
  if (codigo.includes('weak-password')) return 'La contraseña debe tener al menos 6 caracteres.'
  if (codigo.includes('invalid-email')) return 'El correo no es válido.'
  if (codigo.includes('too-many-requests')) return 'Demasiados intentos. Espera unos minutos.'
  return 'Correo o contraseña incorrectos.'
}

function InicioSesion() {
  const [modo, setModo] = useState<'entrar' | 'registro' | 'recuperar'>('entrar')
  const [correo, setCorreo] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [mensaje, setMensaje] = useState<{ tipo: 'error' | 'ok'; texto: string } | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function entrar(e: FormEvent) {
    e.preventDefault()
    if (!auth) return
    setEnviando(true)
    setMensaje(null)
    try {
      if (modo === 'recuperar') {
        await sendPasswordResetEmail(auth, correo.trim())
        setMensaje({ tipo: 'ok', texto: 'Te enviamos un correo para cambiar la contraseña. Revisa también la carpeta de spam.' })
      } else {
        await signInWithEmailAndPassword(auth, correo.trim(), contrasena)
      }
    } catch (error) {
      setMensaje({ tipo: 'error', texto: mensajeDeError(error) })
    } finally {
      setEnviando(false)
    }
  }

  if (modo === 'registro') return <Registro onVolver={() => setModo('entrar')} />

  return (
    <Acceso>
      <form className="formulario-acceso" onSubmit={entrar}>
        <h2>{modo === 'recuperar' ? 'Recuperar contraseña' : 'Iniciar sesión'}</h2>
        <label className="campo">
          <span>Correo</span>
          <input type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} autoComplete="username" required />
        </label>
        {modo === 'entrar' && (
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
        )}
        {mensaje && <p className={`mensaje mensaje-${mensaje.tipo}`}>{mensaje.texto}</p>}
        <button type="submit" className="boton boton-ancho" disabled={enviando}>
          {modo === 'recuperar' ? 'Enviar correo' : enviando ? 'Entrando…' : 'Entrar'}
        </button>
        <div className="acceso-enlaces">
          <button type="button" className="boton-enlace" onClick={() => setModo(modo === 'entrar' ? 'recuperar' : 'entrar')}>
            {modo === 'entrar' ? '¿Olvidaste tu contraseña?' : 'Volver a iniciar sesión'}
          </button>
          <button type="button" className="boton-enlace" onClick={() => setModo('registro')}>
            Soy delegado: crear cuenta
          </button>
        </div>
      </form>
    </Acceso>
  )
}

/** Datos que pide el registro de un delegado, además de correo y contraseña. */
function CamposDelegado({ nombre, equipo, onNombre, onEquipo }: {
  nombre: string
  equipo: string
  onNombre: (v: string) => void
  onEquipo: (v: string) => void
}) {
  const carga = useTorneos()
  const equipos = carga.estado === 'listo' ? [...(carga.torneos[0]?.equipos ?? [])].sort((a, b) => a.nombre.localeCompare(b.nombre)) : []
  return (
    <>
      <label className="campo">
        <span>Tu nombre</span>
        <input value={nombre} onChange={(e) => onNombre(e.target.value)} maxLength={60} autoComplete="name" required />
      </label>
      <label className="campo">
        <span>Equipo que representas</span>
        <select value={equipo} onChange={(e) => onEquipo(e.target.value)} required>
          <option value="">Elige tu equipo</option>
          {equipos.map((eq) => (
            <option key={eq.id} value={eq.nombre}>
              {eq.nombre}
            </option>
          ))}
        </select>
      </label>
    </>
  )
}

function Registro({ onVolver }: { onVolver: () => void }) {
  const [nombre, setNombre] = useState('')
  const [equipo, setEquipo] = useState('')
  const [correo, setCorreo] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function registrar(e: FormEvent) {
    e.preventDefault()
    if (!auth) return
    setEnviando(true)
    setError('')
    try {
      const { user } = await createUserWithEmailAndPassword(auth, correo.trim(), contrasena)
      await solicitarCuenta(user.uid, { nombre: nombre.trim(), correo: correo.trim(), equipoSolicitado: equipo })
    } catch (err) {
      setError(mensajeDeError(err))
      setEnviando(false)
    }
  }

  return (
    <Acceso>
      <form className="formulario-acceso" onSubmit={registrar}>
        <h2>Crear cuenta de delegado</h2>
        <p className="texto-suave">El administrador de la liga revisa tu cuenta y te asigna tu equipo antes de que puedas capturar.</p>
        <CamposDelegado nombre={nombre} equipo={equipo} onNombre={setNombre} onEquipo={setEquipo} />
        <label className="campo">
          <span>Correo</span>
          <input type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} autoComplete="username" required />
        </label>
        <label className="campo">
          <span>Contraseña (mínimo 6 caracteres)</span>
          <input
            type="password"
            value={contrasena}
            onChange={(e) => setContrasena(e.target.value)}
            autoComplete="new-password"
            minLength={6}
            required
          />
        </label>
        {error && <p className="mensaje mensaje-error">{error}</p>}
        <button type="submit" className="boton boton-ancho" disabled={enviando}>
          {enviando ? 'Creando cuenta…' : 'Crear cuenta'}
        </button>
        <button type="button" className="boton-enlace" onClick={onVolver}>
          Ya tengo cuenta: iniciar sesión
        </button>
      </form>
    </Acceso>
  )
}

/** Para una cuenta que existe en Authentication pero aún no tiene ficha (por ejemplo, si el registro se interrumpió). */
function CompletarRegistro({ usuario }: { usuario: User }) {
  const [nombre, setNombre] = useState('')
  const [equipo, setEquipo] = useState('')
  const [error, setError] = useState('')

  async function completar(e: FormEvent) {
    e.preventDefault()
    try {
      await solicitarCuenta(usuario.uid, { nombre: nombre.trim(), correo: usuario.email ?? '', equipoSolicitado: equipo })
    } catch {
      setError('No se pudo enviar. Revisa tu conexión e intenta de nuevo.')
    }
  }

  return (
    <Acceso>
      <form className="formulario-acceso" onSubmit={completar}>
        <h2>Completa tu registro</h2>
        <p className="texto-suave">
          La cuenta <strong>{usuario.email}</strong> todavía no tiene acceso. Si eres delegado, dinos qué equipo representas.
        </p>
        <CamposDelegado nombre={nombre} equipo={equipo} onNombre={setNombre} onEquipo={setEquipo} />
        {error && <p className="mensaje mensaje-error">{error}</p>}
        <button type="submit" className="boton boton-ancho">
          Enviar
        </button>
        <button type="button" className="boton boton-secundario boton-ancho" onClick={() => auth && signOut(auth)}>
          Usar otra cuenta
        </button>
      </form>
    </Acceso>
  )
}
