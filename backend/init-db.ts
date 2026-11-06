import { db, initializeDatabase } from './index'

initializeDatabase()
  .then(() => {
    console.log('Database initialized.')
    db.close((error) => {
      if (error) {
        console.error('Failed to close database', error)
        process.exitCode = 1
      }
    })
  })
  .catch((error: unknown) => {
    console.error('Failed to initialize database', error)
    db.close((closeError) => {
      if (closeError) {
        console.error('Failed to close database', closeError)
      }
      process.exitCode = 1
    })
  })
