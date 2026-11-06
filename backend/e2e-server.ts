import type { Server } from 'node:http'

process.env.PORT = '3301'

import { app, db, initializeDatabase } from './index'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must point to an isolated E2E database')
}

let server: Server | undefined
let shuttingDown = false

async function shutdown(): Promise<void> {
  if (shuttingDown) return
  shuttingDown = true

  if (server) {
    await new Promise<void>((resolve, reject) => {
      server?.close((error) => (error ? reject(error) : resolve()))
    })
  }
  await new Promise<void>((resolve, reject) => {
    db.close((error) => (error ? reject(error) : resolve()))
  })
}

process.on('SIGINT', () => {
  void shutdown().then(() => process.exit(0))
})
process.on('SIGTERM', () => {
  void shutdown().then(() => process.exit(0))
})

initializeDatabase()
  .then(() => {
    server = app.listen(Number(process.env.PORT), '127.0.0.1', () => {
      console.log('Isolated E2E API listening on http://127.0.0.1:3301')
    })
  })
  .catch((error: unknown) => {
    console.error('Failed to initialize isolated E2E database', error)
    void shutdown().then(() => process.exit(1))
  })
