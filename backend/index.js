const crypto = require('node:crypto')
const path = require('node:path')
const cors = require('cors')
const express = require('express')
const sqlite3 = require('sqlite3').verbose()

const projectRoot = path.resolve(__dirname, '..')
require('dotenv').config({ path: path.join(projectRoot, '.env') })

const app = express()
const port = Number(process.env.PORT) || 3000
const configuredDatabasePath = process.env.DATABASE_URL || process.env.DB_PATH
const databasePath = configuredDatabasePath
  ? path.resolve(projectRoot, configuredDatabasePath)
  : path.join(__dirname, 'data.sqlite3')
const db = new sqlite3.Database(databasePath)
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const creatorsToSeed = [
  'Amara Silva',
  'Luna Costa',
  'Sofia Martins',
  'Isabella Rocha',
  'Maya Oliveira',
]

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (error) {
      if (error) {
        reject(error)
        return
      }

      resolve({ changes: this.changes, lastID: this.lastID })
    })
  })
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (error, row) => {
      if (error) {
        reject(error)
        return
      }

      resolve(row)
    })
  })
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (error, rows) => {
      if (error) {
        reject(error)
        return
      }

      resolve(rows)
    })
  })
}

async function initializeDatabase() {
  await run('PRAGMA foreign_keys = ON')
  await run(`
    CREATE TABLE IF NOT EXISTS creators (
      uuid TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `)
  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL
    )
  `)
  await run(`
    CREATE TABLE IF NOT EXISTS followers (
      creator_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE (creator_id, user_id),
      FOREIGN KEY (creator_id) REFERENCES creators(uuid) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `)

  await run('BEGIN IMMEDIATE TRANSACTION')
  try {
    const creatorCount = await get('SELECT COUNT(*) AS count FROM creators')
    if (creatorCount.count === 0) {
      for (const name of creatorsToSeed) {
        await run(
          'INSERT INTO creators (uuid, name, created_at) VALUES (?, ?, ?)',
          [crypto.randomUUID(), name, new Date().toISOString()],
        )
      }
    }
    await run('COMMIT')
  } catch (error) {
    await run('ROLLBACK')
    throw error
  }
}

function validUuid(value) {
  return typeof value === 'string' && uuidPattern.test(value)
}

async function findCreator(creatorId, response) {
  const creator = await get('SELECT uuid FROM creators WHERE uuid = ?', [creatorId])
  if (!creator) {
    response.status(404).json({ error: 'Creator not found' })
    return false
  }
  return true
}

async function findUser(userId, response) {
  const user = await get('SELECT id FROM users WHERE id = ?', [userId])
  if (!user) {
    response.status(404).json({ error: 'User not found' })
    return false
  }
  return true
}

app.use(cors())
app.use(express.json())

app.get('/health', (request, response) => {
  response.json({ status: 'ok' })
})

app.post('/users/anonymous', async (request, response) => {
  const { id } = request.body ?? {}
  if (!validUuid(id)) {
    response.status(400).json({ error: 'A valid user UUID is required' })
    return
  }

  await run('INSERT OR IGNORE INTO users (id, name) VALUES (?, ?)', [id, 'guest'])
  const user = await get('SELECT id, name FROM users WHERE id = ?', [id])
  response.status(200).json(user)
})

app.get('/creators', async (request, response) => {
  const userId = request.query.userId
  if (!validUuid(userId)) {
    response.status(400).json({ error: 'A valid userId query parameter is required' })
    return
  }
  if (!(await findUser(userId, response))) return

  const creators = await all(
    `SELECT
      c.uuid AS id,
      c.name,
      c.created_at AS createdAt,
      COUNT(f.user_id) AS followerCount,
      EXISTS (
        SELECT 1 FROM followers own_follow
        WHERE own_follow.creator_id = c.uuid AND own_follow.user_id = ?
      ) AS isFollowing
    FROM creators c
    LEFT JOIN followers f ON f.creator_id = c.uuid
    GROUP BY c.uuid
    ORDER BY c.created_at ASC`,
    [userId],
  )

  response.json(
    creators.map((creator) => ({
      ...creator,
      followerCount: Number(creator.followerCount),
      isFollowing: Boolean(creator.isFollowing),
    })),
  )
})

app.post('/creators/:creatorId/followers', async (request, response) => {
  const { creatorId } = request.params
  const { userId } = request.body ?? {}
  if (!validUuid(creatorId) || !validUuid(userId)) {
    response.status(400).json({ error: 'Valid creatorId and userId UUIDs are required' })
    return
  }
  if (!(await findCreator(creatorId, response))) return
  if (!(await findUser(userId, response))) return

  try {
    await run(
      'INSERT INTO followers (creator_id, user_id, created_at) VALUES (?, ?, ?)',
      [creatorId, userId, new Date().toISOString()],
    )
  } catch (error) {
    if (
      error.code === 'SQLITE_CONSTRAINT' &&
      error.message.includes('UNIQUE constraint failed: followers.creator_id, followers.user_id')
    ) {
      response.status(409).json({ error: 'User already follows this creator' })
      return
    }
    throw error
  }

  response.status(201).json({ creatorId, userId, following: true })
})

app.delete('/creators/:creatorId/followers/:userId', async (request, response) => {
  const { creatorId, userId } = request.params
  if (!validUuid(creatorId) || !validUuid(userId)) {
    response.status(400).json({ error: 'Valid creatorId and userId UUIDs are required' })
    return
  }
  if (!(await findCreator(creatorId, response))) return
  if (!(await findUser(userId, response))) return

  const result = await run('DELETE FROM followers WHERE creator_id = ? AND user_id = ?', [
    creatorId,
    userId,
  ])
  if (result.changes === 0) {
    response.status(404).json({ error: 'Follow relationship not found' })
    return
  }
  response.status(204).end()
})

app.get('/creators/:creatorId/followers/count', async (request, response) => {
  const { creatorId } = request.params
  if (!validUuid(creatorId)) {
    response.status(400).json({ error: 'A valid creatorId UUID is required' })
    return
  }
  if (!(await findCreator(creatorId, response))) return

  const result = await get(
    'SELECT COUNT(*) AS count FROM followers WHERE creator_id = ?',
    [creatorId],
  )
  response.json({ creatorId, count: Number(result.count) })
})

app.use((request, response) => {
  response.status(404).json({ error: 'Route not found' })
})

app.use((error, request, response, next) => {
  if (error.type === 'entity.parse.failed') {
    response.status(400).json({ error: 'Invalid JSON request body' })
    return
  }
  console.error(error)
  if (response.headersSent) {
    next(error)
    return
  }
  response.status(500).json({ error: 'Internal server error' })
})

module.exports = { app, db, initializeDatabase }

if (require.main === module) {
  initializeDatabase()
    .then(() => {
      app.listen(port, () => {
        console.log(`Creator follow API listening on http://localhost:${port}`)
      })
    })
    .catch((error) => {
      console.error('Failed to initialize database', error)
      db.close()
      process.exitCode = 1
    })
}
