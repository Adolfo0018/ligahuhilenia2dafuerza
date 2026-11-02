import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Firestore pesa ~600 kB sin comprimir; el sitio lo necesita para leer los torneos en tiempo real.
  build: { chunkSizeWarningLimit: 800 },
  // La carpeta está en OneDrive, que a veces no avisa de los cambios; revisar periódicamente evita recargas incompletas.
  server: { watch: { usePolling: true, interval: 300 } },
})
