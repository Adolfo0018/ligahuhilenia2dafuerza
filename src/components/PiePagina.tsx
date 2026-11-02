import { liga } from '../data'

export function PiePagina() {
  return (
    <footer className="pie">
      {liga.nombre} · Por ahora se muestran datos de ejemplo; la captura real llega en la fase 2.
    </footer>
  )
}
