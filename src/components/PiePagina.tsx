import { liga } from '../data'
import { firebaseConfigurado } from '../lib/firebase'
import { nombreLiga } from '../lib/formato'

export function PiePagina() {
  return (
    <footer className="pie">
      <p>
        {nombreLiga(liga)}
        {!firebaseConfigurado && ' · Por ahora se muestran datos de ejemplo.'}
      </p>
      <a href="/admin">Acceso para administradores</a>
    </footer>
  )
}
