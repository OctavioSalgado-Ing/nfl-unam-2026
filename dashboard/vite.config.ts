import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base './' para que el build funcione publicado en una subruta (/evento/equipo/).
// En desarrollo Vite y Uvicorn corren por separado: /api se reenvía a Uvicorn en el puerto 8000.
export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    proxy: { '/api': 'http://localhost:8000' },
  },
})
