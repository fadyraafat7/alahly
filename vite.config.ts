import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    allowedHosts: ['alahly.test'],
    proxy: {
      '/wp-json': {
        target: 'http://alahly.test',
        changeOrigin: true,
      },
    },
  },
  plugins: [tailwindcss(), react(), babel({ presets: [reactCompilerPreset()] })],
})
