import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { allowedHosts: ['.manus.computer'] },
  // Keep generated output away from the tracked GitHub Pages site.
  build: { outDir: 'build/web', emptyOutDir: true },
})
