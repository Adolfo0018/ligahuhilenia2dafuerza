import { getAuth } from 'firebase/auth'
import { app } from './firebase'

// Separado de firebase.ts para que el sitio público no descargue Authentication; solo lo usa el panel.
export const auth = app ? getAuth(app) : null
