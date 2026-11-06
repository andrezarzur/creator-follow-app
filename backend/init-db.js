const { db, initializeDatabase } = require('./index')

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
  .catch((error) => {
    console.error('Failed to initialize database', error)
    db.close(() => {
      process.exitCode = 1
    })
  })
