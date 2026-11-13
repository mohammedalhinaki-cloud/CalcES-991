import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Arena's reverse-proxied browser uses a per-sandbox *.e2b.app host.
    allowedHosts: ['.e2b.app'],
  },
  // Keep generated output away from the tracked GitHub Pages site.
  build: { outDir: 'build/web', emptyOutDir: true },
})
