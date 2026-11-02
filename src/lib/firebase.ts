import { initializeApp } from 'firebase/app'
import { initializeFirestore } from 'firebase/firestore'

// Esta configuración identifica el proyecto y está hecha para ir en el navegador: no es secreta.
// Lo que protege los datos son las reglas de firestore.rules.
// Mientras esté vacía, la app muestra los datos de ejemplo de src/data/ejemplo.ts.
const configuracion = {
  apiKey: 'AIzaSyDT47mMB3vwCUT-C6fIVGKbSw1yMmFOP-M',
  authDomain: 'liga-huhilenia2dafuerza.firebaseapp.com',
  projectId: 'liga-huhilenia2dafuerza',
  storageBucket: 'liga-huhilenia2dafuerza.firebasestorage.app',
  messagingSenderId: '489795969627',
  appId: '1:489795969627:web:0df6a0d1b5f03ad09a157e',
}

export const firebaseConfigurado = configuracion.projectId !== ''

export const app = firebaseConfigurado ? initializeApp(configuracion) : null

// Firestore no acepta campos `undefined` (por ejemplo, un gol sin asistencia); así simplemente se omiten.
export const db = app ? initializeFirestore(app, { ignoreUndefinedProperties: true }) : null
