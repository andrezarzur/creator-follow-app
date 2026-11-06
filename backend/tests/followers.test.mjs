import { randomUUID } from 'node:crypto'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import supertest from 'supertest'

const originalDatabaseUrl = process.env.DATABASE_URL
let temporaryDirectory
let app
let db
let initializeDatabase
let creatorId
let userId

function execute(sql, parameters = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, parameters, (error) => {
      if (error) {
        reject(error)
        return
      }
      resolve()
    })
  })
}

function get(sql, parameters = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, parameters, (error, row) => {
      if (error) {
        reject(error)
        return
      }
      resolve(row)
    })
  })
}

describe('creator followers API', () => {
  beforeAll(async () => {
    temporaryDirectory = mkdtempSync(path.join(tmpdir(), 'creator-follow-api-'))
    process.env.DATABASE_URL = path.join(temporaryDirectory, 'integration.sqlite')
    ;({ app, db, initializeDatabase } = await import('../index.ts'))
    await initializeDatabase()
    const creator = await get('SELECT uuid FROM creators ORDER BY created_at LIMIT 1')
    creatorId = creator.uuid
  })

  beforeEach(async () => {
    await execute('DELETE FROM followers')
    await execute('DELETE FROM users')
    userId = randomUUID()
    await supertest(app).post('/users/anonymous').send({ id: userId }).expect(200)
  })

  afterAll(async () => {
    if (db) {
      await new Promise((resolve, reject) => {
        db.close((error) => (error ? reject(error) : resolve()))
      })
    }
    if (temporaryDirectory) {
      rmSync(temporaryDirectory, { recursive: true, force: true })
    }
    if (originalDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL
    } else {
      process.env.DATABASE_URL = originalDatabaseUrl
    }
  })

  it('creates a follow with 201 and rejects a duplicate with 409', async () => {
    const firstFollow = await supertest(app)
      .post(`/creators/${creatorId}/followers`)
      .send({ userId })
      .expect(201)

    expect(firstFollow.body).toEqual({ creatorId, userId, following: true })

    await supertest(app)
      .post(`/creators/${creatorId}/followers`)
      .send({ userId })
      .expect(409)
      .expect(({ body }) => {
        expect(body.error).toBe('User already follows this creator')
      })

    await supertest(app)
      .get(`/creators/${creatorId}/followers/count`)
      .expect(200)
      .expect(({ body }) => expect(body.count).toBe(1))
  })

  it('unfollows with 204 and returns 404 when the relationship is absent', async () => {
    await supertest(app)
      .post(`/creators/${creatorId}/followers`)
      .send({ userId })
      .expect(201)

    const unfollow = await supertest(app)
      .delete(`/creators/${creatorId}/followers/${userId}`)
      .expect(204)
    expect(unfollow.text).toBe('')

    await supertest(app)
      .delete(`/creators/${creatorId}/followers/${userId}`)
      .expect(404)
      .expect(({ body }) => {
        expect(body.error).toBe('Follow relationship not found')
      })
  })

  it('rejects invalid creator UUIDs', async () => {
    await supertest(app)
      .post('/creators/not-a-uuid/followers')
      .send({ userId })
      .expect(400)
    await supertest(app).get('/creators/not-a-uuid/followers/count').expect(400)
  })

  it('rejects invalid and missing user UUIDs', async () => {
    await supertest(app)
      .post(`/creators/${creatorId}/followers`)
      .send({ userId: 'not-a-uuid' })
      .expect(400)
    await supertest(app)
      .post(`/creators/${creatorId}/followers`)
      .send({})
      .expect(400)
    await supertest(app)
      .delete(`/creators/${creatorId}/followers/not-a-uuid`)
      .expect(400)
  })

  it('returns 400 for malformed JSON request bodies', async () => {
    await supertest(app)
      .post(`/creators/${creatorId}/followers`)
      .set('Content-Type', 'application/json')
      .send('{"userId":')
      .expect(400)
      .expect(({ body }) => {
        expect(body.error).toBe('Invalid JSON request body')
      })
  })

  it('returns 404 when the creator does not exist', async () => {
    const missingCreatorId = randomUUID()
    await supertest(app)
      .post(`/creators/${missingCreatorId}/followers`)
      .send({ userId })
      .expect(404)
    await supertest(app)
      .get(`/creators/${missingCreatorId}/followers/count`)
      .expect(404)
  })

  it('returns 404 when the user does not exist', async () => {
    await supertest(app)
      .post(`/creators/${creatorId}/followers`)
      .send({ userId: randomUUID() })
      .expect(404)
  })

  it('returns 200 and zero for a creator with no followers', async () => {
    await supertest(app)
      .get(`/creators/${creatorId}/followers/count`)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual({ creatorId, count: 0 })
      })
  })

  it('returns the correct follower count for multiple users', async () => {
    await supertest(app)
      .post(`/creators/${creatorId}/followers`)
      .send({ userId })
      .expect(201)
    const secondUserId = randomUUID()
    await supertest(app)
      .post('/users/anonymous')
      .send({ id: secondUserId })
      .expect(200)
    await supertest(app)
      .post(`/creators/${creatorId}/followers`)
      .send({ userId: secondUserId })
      .expect(201)

    await supertest(app)
      .get(`/creators/${creatorId}/followers/count`)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual({ creatorId, count: 2 })
      })
  })

  it('seeds five creators and reports each user follow state', async () => {
    const response = await supertest(app)
      .get(`/creators?userId=${userId}`)
      .expect(200)

    expect(response.body).toHaveLength(5)
    expect(response.body.every((creator) => creator.isFollowing === false)).toBe(true)
    expect(response.body.every((creator) => creator.followerCount === 0)).toBe(true)
  })
})
