import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 15000,
  use: {
    baseURL: 'http://localhost:3333',
    screenshot: 'only-on-failure'
  },
  webServer: {
    command: 'node bin/sentinel-web.js --port 3333',
    port: 3333,
    timeout: 10000,
    reuseExistingServer: false
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } }
  ]
})
