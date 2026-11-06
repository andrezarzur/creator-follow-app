import { defineConfig, devices } from '@playwright/test'

if (!process.env.E2E_DATABASE_URL) {
  throw new Error('Run E2E tests through the frontend test:e2e script')
}

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:5174',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: 'node e2e-server.js',
      cwd: '../backend',
      url: 'http://127.0.0.1:3301/health',
      reuseExistingServer: false,
      timeout: 30_000,
      env: {
        DATABASE_URL: process.env.E2E_DATABASE_URL,
      },
    },
    {
      command: 'npm run dev -- --host 127.0.0.1 --port 5174 --strictPort',
      cwd: '.',
      url: 'http://127.0.0.1:5174',
      reuseExistingServer: false,
      timeout: 30_000,
      env: {
        VITE_API_TARGET: 'http://127.0.0.1:3301',
      },
    },
  ],
})
