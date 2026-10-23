import { defineConfig } from '@playwright/test'
import base from './playwright.config'

// Run identical acceptance flows against the artifact that would be deployed.
export default defineConfig({
  ...base,
  metadata: { production: true },
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --port 5174 --strictPort',
    url: 'http://127.0.0.1:5174',
    reuseExistingServer: false,
  },
})
