import { randomUUID } from 'node:crypto'
import path from 'node:path'
import cors from 'cors'
import express, {
  type ErrorRequestHandler,
  type Request,
  type Response,
} from 'express'
import sqlite3 from 'sqlite3'

const backendDirectory =
  path.basename(__dirname) === 'dist' ? path.resolve(__dirname, '..') : __dirname
const projectRoot = path.resolve(backendDirectory, '..')
require('dotenv').config({ path: path.join(projectRoot, '.env') })

const app = express()
const port = Number(process.env.PORT) || 3000
const configuredDatabasePath = process.env.DATABASE_URL || process.env.DB_PATH
const databasePath = configuredDatabasePath
  ? path.resolve(projectRoot, configuredDatabasePath)
  : path.join(backendDirectory, 'data.sqlite3')
const db = new sqlite3.Database(databasePath)
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

type SqlParameter = string | number | null

interface RunResult {
  changes: number
  lastID: number
}

interface CreatorCountRow {
  count: number
}

interface CreatorRow {
  id: string
  name: string
  createdAt: string
  followerCount: number
  isFollowing: number
}

interface CreatorListItem {
  id: string
  name: string
  createdAt: string
  followerCount: number
  isFollowing: boolean
}

interface UserRow {
  id: string
  name: string
}

interface ErrorResponse {
  error: string
}

interface SqliteError extends Error {
  code?: string
}

interface JsonBody {
  [key: string]: unknown
}

const creatorsToSeed = [
  'Amara Silva',
  'Luna Costa',
  'Sofia Martins',
  'Isabella Rocha',
  'Maya Oliveira',
]

function run(sql: string, params: SqlParameter[] = []): Promise<RunResult> {
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

function get<T>(sql: string, params: SqlParameter[] = []): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    db.get<T>(sql, params, (error, row) => {
      if (error) {
        reject(error)
        return
      }

      resolve(row)
    })
  })
}

function all<T>(sql: string, params: SqlParameter[] = []): Promise<T[]> {
  return new Promise((resolve, reject) => {
    db.all<T>(sql, params, (error, rows) => {
      if (error) {
        reject(error)
        return
      }

      resolve(rows)
    })
  })
}

async function initializeDatabase(): Promise<void> {
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
    const creatorCount = await get<CreatorCountRow>(
      'SELECT COUNT(*) AS count FROM creators',
    )
    if (creatorCount?.count === 0) {
      for (const name of creatorsToSeed) {
        await run(
          'INSERT INTO creators (uuid, name, created_at) VALUES (?, ?, ?)',
          [randomUUID(), name, new Date().toISOString()],
        )
      }
    }
    await run('COMMIT')
  } catch (error) {
    await run('ROLLBACK')
    throw error
  }
}

function validUuid(value: unknown): value is string {
  return typeof value === 'string' && uuidPattern.test(value)
}

function isJsonBody(value: unknown): value is JsonBody {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function getJsonBody(value: unknown): JsonBody {
  return isJsonBody(value) ? value : {}
}

function isDuplicateFollowError(error: unknown): error is SqliteError {
  return (
    error instanceof Error &&
    'code' in error &&
    error.code === 'SQLITE_CONSTRAINT' &&
    error.message.includes(
      'UNIQUE constraint failed: followers.creator_id, followers.user_id',
    )
  )
}

async function findCreator(creatorId: string): Promise<boolean> {
  const creator = await get<{ uuid: string }>(
    'SELECT uuid FROM creators WHERE uuid = ?',
    [creatorId],
  )
  return Boolean(creator)
}

async function findUser(userId: string): Promise<boolean> {
  const user = await get<{ id: string }>('SELECT id FROM users WHERE id = ?', [
    userId,
  ])
  return Boolean(user)
}

app.use(cors())
app.use(express.json())

app.get('/health', (_request, response) => {
  response.json({ status: 'ok' })
})

app.post(
  '/users/anonymous',
  async (request: Request, response: Response<ErrorResponse | UserRow>) => {
    const { id } = getJsonBody(request.body)
    if (!validUuid(id)) {
      response.status(400).json({ error: 'A valid user UUID is required' })
      return
    }

    await run('INSERT OR IGNORE INTO users (id, name) VALUES (?, ?)', [id, 'guest'])
    const user = await get<UserRow>('SELECT id, name FROM users WHERE id = ?', [
      id,
    ])
    if (!user) {
      throw new Error('User could not be retrieved after creation')
    }
    response.status(200).json(user)
  },
)

app.get(
  '/creators',
  async (
    request: Request,
    response: Response<ErrorResponse | CreatorListItem[]>,
  ) => {
    const userId = request.query.userId
    if (!validUuid(userId)) {
      response
        .status(400)
        .json({ error: 'A valid userId query parameter is required' })
      return
    }
    if (!(await findUser(userId))) {
      response.status(404).json({ error: 'User not found' })
      return
    }

    const creators = await all<CreatorRow>(
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
        id: creator.id,
        name: creator.name,
        createdAt: creator.createdAt,
        followerCount: Number(creator.followerCount),
        isFollowing: Boolean(creator.isFollowing),
      })),
    )
  },
)

app.post(
  '/creators/:creatorId/followers',
  async (
    request: Request<{ creatorId: string }, ErrorResponse, unknown>,
    response: Response<ErrorResponse | { creatorId: string; userId: string; following: true }>,
  ) => {
    const { creatorId } = request.params
    const { userId } = getJsonBody(request.body)
    if (!validUuid(creatorId) || !validUuid(userId)) {
      response
        .status(400)
        .json({ error: 'Valid creatorId and userId UUIDs are required' })
      return
    }
    if (!(await findCreator(creatorId))) {
      response.status(404).json({ error: 'Creator not found' })
      return
    }
    if (!(await findUser(userId))) {
      response.status(404).json({ error: 'User not found' })
      return
    }

    try {
      await run(
        'INSERT INTO followers (creator_id, user_id, created_at) VALUES (?, ?, ?)',
        [creatorId, userId, new Date().toISOString()],
      )
    } catch (error) {
      if (isDuplicateFollowError(error)) {
        response
          .status(409)
          .json({ error: 'User already follows this creator' })
        return
      }
      throw error
    }

    response.status(201).json({ creatorId, userId, following: true })
  },
)

app.delete(
  '/creators/:creatorId/followers/:userId',
  async (
    request: Request<{ creatorId: string; userId: string }>,
    response: Response<ErrorResponse>,
  ) => {
    const { creatorId, userId } = request.params
    if (!validUuid(creatorId) || !validUuid(userId)) {
      response
        .status(400)
        .json({ error: 'Valid creatorId and userId UUIDs are required' })
      return
    }
    if (!(await findCreator(creatorId))) {
      response.status(404).json({ error: 'Creator not found' })
      return
    }
    if (!(await findUser(userId))) {
      response.status(404).json({ error: 'User not found' })
      return
    }

    const result = await run(
      'DELETE FROM followers WHERE creator_id = ? AND user_id = ?',
      [creatorId, userId],
    )
    if (result.changes === 0) {
      response.status(404).json({ error: 'Follow relationship not found' })
      return
    }
    response.status(204).end()
  },
)

app.get(
  '/creators/:creatorId/followers/count',
  async (
    request: Request<{ creatorId: string }>,
    response: Response<ErrorResponse | { creatorId: string; count: number }>,
  ) => {
    const { creatorId } = request.params
    if (!validUuid(creatorId)) {
      response
        .status(400)
        .json({ error: 'A valid creatorId UUID is required' })
      return
    }
    if (!(await findCreator(creatorId))) {
      response.status(404).json({ error: 'Creator not found' })
      return
    }

    const result = await get<CreatorCountRow>(
      'SELECT COUNT(*) AS count FROM followers WHERE creator_id = ?',
      [creatorId],
    )
    if (!result) {
      throw new Error('Follower count could not be retrieved')
    }
    response.json({ creatorId, count: Number(result.count) })
  },
)

app.use((_request, response) => {
  response.status(404).json({ error: 'Route not found' })
})

const errorHandler: ErrorRequestHandler = (error: unknown, _request, response, next) => {
  if (
    typeof error === 'object' &&
    error !== null &&
    'type' in error &&
    error.type === 'entity.parse.failed'
  ) {
    response.status(400).json({ error: 'Invalid JSON request body' })
    return
  }
  console.error(error)
  if (response.headersSent) {
    next(error)
    return
  }
  response.status(500).json({ error: 'Internal server error' })
}

app.use(errorHandler)

export { app, db, initializeDatabase }

if (require.main === module) {
  initializeDatabase()
    .then(() => {
      app.listen(port, () => {
        console.log(`Creator follow API listening on http://localhost:${port}`)
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
}
