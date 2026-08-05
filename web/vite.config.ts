import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// base = nombre del repo: se sirve en GitHub Pages como
// https://<usuario>.github.io/tfb-tournaments/ (project page, no dominio propio).
export default defineConfig({
  base: '/tfb-tournaments/',
  plugins: [react()],
})
