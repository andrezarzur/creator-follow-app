process.env.PORT = '3301'

const { app, db, initializeDatabase } = require('./index')

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must point to an isolated E2E database')
}

let server
let shuttingDown = false

async function shutdown() {
  if (shuttingDown) return
  shuttingDown = true

  const closeServer = server
    ? new Promise((resolve) => server.close(resolve))
    : Promise.resolve()
  await closeServer
  await new Promise((resolve, reject) => {
    db.close((error) => (error ? reject(error) : resolve()))
  })
}

process.on('SIGINT', () => {
  shutdown().finally(() => process.exit(0))
})
process.on('SIGTERM', () => {
  shutdown().finally(() => process.exit(0))
})

initializeDatabase()
  .then(() => {
    server = app.listen(Number(process.env.PORT), '127.0.0.1', () => {
      console.log('Isolated E2E API listening on http://127.0.0.1:3301')
    })
  })
  .catch((error) => {
    console.error('Failed to initialize isolated E2E database', error)
    shutdown().finally(() => process.exit(1))
  })
