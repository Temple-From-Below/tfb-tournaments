import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// base = nombre del repo: se sirve en GitHub Pages como
// https://<usuario>.github.io/tfb-tournaments/ (project page, no dominio propio).
export default defineConfig({
  base: '/tfb-tournaments/',
  plugins: [react()],
  define: {
    // Se usa como "?v=" en las peticiones a los JSON de datos, para que un
    // deploy nuevo siempre pida contenido fresco y nunca sirva una copia en
    // cache (del navegador o de la CDN de GitHub Pages) de un build previo.
    __BUILD_ID__: JSON.stringify(String(Date.now())),
  },
})
