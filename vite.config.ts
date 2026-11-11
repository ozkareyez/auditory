import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Rutas relativas: el build funciona en cualquier carpeta del servidor,
  // no solo en la raíz del dominio.
  base: './',
})
