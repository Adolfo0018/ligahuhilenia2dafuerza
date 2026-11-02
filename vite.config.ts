import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // La carpeta está en OneDrive, que a veces no avisa de los cambios; revisar periódicamente evita recargas incompletas.
  server: { watch: { usePolling: true, interval: 300 } },
})
