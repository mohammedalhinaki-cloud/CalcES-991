import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  // Allow cold MathLive loading on shared cloud CPUs; calculation worker timeout stays 10s.
  timeout: 60000,
  expect: { timeout: 15000 },
  fullyParallel: false,
  use: {
    baseURL: 'http://127.0.0.1:5174',
    launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH },
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 5174 --strictPort',
    url: 'http://127.0.0.1:5174',
    reuseExistingServer: false,
  },
})
