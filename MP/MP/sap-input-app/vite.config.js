import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  build: {
    sourcemap: false, // Disable source maps in production (prevents .map file 404 in nginx logs)
  },
  server: {
    proxy: {
      '/api': {
        target: 'https://pmreg5.afratarigan.my.id',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})
