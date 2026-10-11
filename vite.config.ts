import { reactRouter } from '@react-router/dev/vite'
import { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { defineConfig, loadEnv } from 'vite'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // Only server modules read these; never expose all env variables through define.
  for (const key of ['WC_STORE_API_URL', 'STOREFRONT_URL']) {
    if (!process.env[key] && env[key]) process.env[key] = env[key]
  }
  return {
    server: {
      host: true, port: 5173, strictPort: true,
      allowedHosts: ['alahly.test'],
      proxy: { '/wp-json': { target: env.VITE_WP_SITE_URL, changeOrigin: true } },
    },
    plugins: [tailwindcss(), reactRouter(), babel({ presets: [reactCompilerPreset()] })],
  }
})
