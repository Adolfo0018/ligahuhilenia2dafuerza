interface Opcion<T extends string> {
  id: T
  nombre: string
}

interface Props<T extends string> {
  etiqueta: string
  opciones: Opcion<T>[]
  valor: T
  onCambiar: (valor: T) => void
  /** Pasa las opciones a otra línea en lugar de desplazarlas cuando no caben. */
  ajustable?: boolean
}

export function Segmentado<T extends string>({ etiqueta, opciones, valor, onCambiar, ajustable = false }: Props<T>) {
  return (
    <div className={ajustable ? 'segmentado segmentado-ajustable' : 'segmentado'} role="group" aria-label={etiqueta}>
      {opciones.map((o) => (
        <button key={o.id} type="button" aria-pressed={o.id === valor} onClick={() => onCambiar(o.id)}>
          {o.nombre}
        </button>
      ))}
    </div>
  )
}
