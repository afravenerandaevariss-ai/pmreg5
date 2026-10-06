import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env vars for the current mode (.env.development, .env.production, etc.)
  const env = loadEnv(mode, process.cwd(), '');

  // Use VITE_SUPABASE_URL from env as proxy target so local 'npm run dev'
  // always forwards /api requests to the correct environment (dev or prod),
  // never hardcoded to PROD.
  const apiProxyTarget = env.VITE_SUPABASE_URL || 'https://pmreg5.afratarigan.my.id';
  if (!env.VITE_SUPABASE_URL) {
    console.warn('[vite.config] VITE_SUPABASE_URL not set — dev proxy will fall back to PROD server!');
  }

  return {
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
          target: apiProxyTarget,
          changeOrigin: true,
          secure: false,
        }
      }
    }
  };
})
