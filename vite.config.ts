import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Keep generated output away from the tracked GitHub Pages site.
  build: { outDir: 'build/web', emptyOutDir: true },
})
