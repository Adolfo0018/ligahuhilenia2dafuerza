interface Props<T extends string> {
  secciones: { id: T; nombre: string }[]
  actual: T
  onCambiar: (id: T) => void
}

export function NavSecciones<T extends string>({ secciones, actual, onCambiar }: Props<T>) {
  return (
    <nav className="nav" aria-label="Secciones">
      <div className="nav-interior">
        {secciones.map((s) => (
          <button
            key={s.id}
            type="button"
            aria-current={s.id === actual ? 'page' : undefined}
            onClick={() => onCambiar(s.id)}
          >
            {s.nombre}
          </button>
        ))}
      </div>
    </nav>
  )
}
