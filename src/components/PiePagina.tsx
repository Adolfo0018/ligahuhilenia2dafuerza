import { liga } from '../data'
import { firebaseConfigurado } from '../lib/firebase'
import { nombreLiga } from '../lib/formato'

/** El administrador puede ocultar el enlace al panel; /admin sigue funcionando escribiéndolo en la dirección. */
export function PiePagina({ acceso = true }: { acceso?: boolean }) {
  return (
    <footer className="pie">
      <p>
        {nombreLiga(liga)}
        {!firebaseConfigurado && ' · Por ahora se muestran datos de ejemplo.'}
      </p>
      {acceso && <a href="/admin">Acceso para administradores</a>}
    </footer>
  )
}
