const { spawn } = require('node:child_process')
const { randomUUID } = require('node:crypto')
const { rm } = require('node:fs/promises')
const { tmpdir } = require('node:os')
const path = require('node:path')

const databasePath = path.join(
  tmpdir(),
  `creator-follow-e2e-${randomUUID()}.sqlite`,
)
const playwrightCli = require.resolve('@playwright/test/cli')

const testProcess = spawn(
  process.execPath,
  [playwrightCli, 'test', '-c', 'playwright.config.ts'],
  {
    cwd: __dirname,
    env: {
      ...process.env,
      E2E_DATABASE_URL: databasePath,
    },
    stdio: 'inherit',
  },
)

testProcess.on('error', async (error) => {
  console.error('Failed to start Playwright', error)
  await cleanup()
  process.exitCode = 1
})

testProcess.on('exit', async (code, signal) => {
  await cleanup()
  if (signal) {
    process.exitCode = 1
    return
  }
  process.exitCode = code ?? 1
})

async function cleanup() {
  await Promise.all(
    ['-journal', '-wal', '-shm', ''].map((suffix) =>
      rm(`${databasePath}${suffix}`, { force: true }),
    ),
  )
}
