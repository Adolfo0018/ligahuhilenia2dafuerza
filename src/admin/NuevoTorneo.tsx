import { useState, type FormEvent } from 'react'
import { nombreTorneo } from '../lib/formato'
import { crearTorneo } from '../lib/repositorio'
import type { TipoCompetencia, Torneo } from '../types'
import { useGuardado } from './useGuardado'

export function NuevoTorneo({ torneos, onCreado }: { torneos: Torneo[]; onCreado: (id: string) => void }) {
  // Liga y Copa se alternan: se propone la competencia contraria a la más reciente.
  const [tipo, setTipo] = useState<TipoCompetencia>(torneos[0]?.tipo === 'liga' ? 'copa' : 'liga')
  const [nombre, setNombre] = useState('')
  const [copiarDe, setCopiarDe] = useState('')
  const { guardar, fallar, guardando, aviso } = useGuardado()
  const enCurso = torneos.filter((t) => t.estado !== 'terminado')

  async function crear(e: FormEvent) {
    e.preventDefault()
    if (!nombre.trim()) return fallar('Escribe el nombre del torneo.')
    let id = ''
    const ok = await guardar(async () => {
      id = await crearTorneo({
        tipo,
        nombre: nombre.trim(),
        copiarDe: torneos.find((t) => t.id === copiarDe),
        terminar: enCurso,
      })
    }, 'Torneo creado')
    if (ok) onCreado(id)
  }

  return (
    <form className="tarjeta formulario" onSubmit={crear}>
      <h2 className="titulo-seccion">Nuevo torneo</h2>
      <div className="campos">
        <label className="campo">
          <span>Competencia</span>
          <select value={tipo} onChange={(e) => setTipo(e.target.value as TipoCompetencia)}>
            <option value="liga">Liga</option>
            <option value="copa">Copa</option>
          </select>
        </label>
        <label className="campo">
          <span>Nombre</span>
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Clausura 2027" maxLength={40} required />
        </label>
        {torneos.length > 0 && (
          <label className="campo">
            <span>Equipos y jugadores</span>
            <select value={copiarDe} onChange={(e) => setCopiarDe(e.target.value)}>
              <option value="">Empezar sin equipos</option>
              {torneos.map((t) => (
                <option key={t.id} value={t.id}>
                  Copiar de {nombreTorneo(t)}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      {enCurso.length > 0 && (
        <p className="nota">
          Al crearlo, {enCurso.map(nombreTorneo).join(' y ')} pasará a terminado: solo hay un torneo en curso a la vez.
        </p>
      )}
      {aviso}
      <div className="acciones">
        <button type="submit" className="boton" disabled={guardando}>
          Crear torneo
        </button>
      </div>
    </form>
  )
}
