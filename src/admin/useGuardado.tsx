import { useState } from 'react'

/** Error con un mensaje pensado para mostrarse tal cual al administrador. */
export class ErrorValidacion extends Error {}

type Estado = { tipo: 'listo' } | { tipo: 'guardando' } | { tipo: 'ok' | 'error'; texto: string }

/** Ejecuta un guardado y muestra "Guardando…", el resultado o el error en un aviso. */
export function useGuardado() {
  const [estado, setEstado] = useState<Estado>({ tipo: 'listo' })

  async function guardar(accion: () => Promise<unknown>, exito = 'Guardado'): Promise<boolean> {
    setEstado({ tipo: 'guardando' })
    try {
      await accion()
      setEstado({ tipo: 'ok', texto: exito })
      return true
    } catch (e) {
      console.error(e)
      setEstado({
        tipo: 'error',
        texto: e instanceof ErrorValidacion ? e.message : 'No se pudo guardar. Revisa tu conexión e intenta de nuevo.',
      })
      return false
    }
  }

  function fallar(texto: string) {
    setEstado({ tipo: 'error', texto })
  }

  const aviso =
    estado.tipo === 'listo' ? null : (
      <p className={`mensaje mensaje-${estado.tipo === 'guardando' ? 'info' : estado.tipo}`} role="status">
        {estado.tipo === 'guardando' ? 'Guardando…' : estado.texto}
      </p>
    )

  return { guardar, fallar, guardando: estado.tipo === 'guardando', aviso }
}
