import { randomUUID } from 'node:crypto'
import { eq, inArray } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { appUsers } from '../database/schema'
import { uniqueViolationConstraint } from '../database/unique-violation'
import { TEST_DATABASE_URL, TestDatabase } from '../test-support/test-database'
import { ensureAppUser, type NewAppUser } from './app-user.writer'

const SLOW = 60_000
const ROUNDS = 25
const TABS = 8

describe.skipIf(!TEST_DATABASE_URL)('ensureAppUser against a real database', () => {
  let data: TestDatabase
  const created: string[] = []

  beforeAll(() => {
    data = new TestDatabase(TEST_DATABASE_URL ?? '')
  })

  afterAll(async () => {
    await data.db.delete(appUsers).where(inArray(appUsers.id, created))
    await data.close()
  })

  const newUser = (phoneHash: Buffer): NewAppUser => {
    const userId = randomUUID()
    created.push(userId)
    return { userId, phoneEncrypted: Buffer.from('x'), phoneHash, emailEncrypted: null, emailHash: null }
  }
  const run = (user: NewAppUser) => data.db.transaction((tx) => ensureAppUser(tx, user))

  it('is idempotent when the same user arrives from several tabs at once (same id and phone hash)', async () => {
    for (let round = 0; round < ROUNDS; round++) {
      const user = newUser(Buffer.from(`race-${randomUUID()}`))
      const results = await Promise.allSettled(Array.from({ length: TABS }, () => run(user)))
      const failures = results.filter((result) => result.status === 'rejected')
      expect(failures).toHaveLength(0)
      expect(await data.db.select({ id: appUsers.id }).from(appUsers).where(eq(appUsers.id, user.userId))).toHaveLength(1)
    }
  }, SLOW)

  it('still refuses another user with the same phone hash (the caller turns it into phoneAlreadyUsed)', async () => {
    const hash = Buffer.from(`taken-${randomUUID()}`)
    const first = newUser(hash)
    await run(first)
    const other = newUser(hash)
    const error = await run(other).then(
      () => null,
      (reason: unknown) => reason,
    )
    expect(uniqueViolationConstraint(error)).toBe('app_users_phone_hash_unique')
    expect(await data.db.select({ id: appUsers.id }).from(appUsers).where(eq(appUsers.id, other.userId))).toHaveLength(0)
  }, SLOW)

  it('leaves exactly one owner for the phone hash when two users race for it, each with several tabs', async () => {
    const hash = Buffer.from(`mixed-${randomUUID()}`)
    const first = newUser(hash)
    const other = newUser(hash)
    const results = await Promise.allSettled([run(first), run(other), run(first), run(other)])
    for (const result of results) {
      if (result.status === 'rejected') expect(uniqueViolationConstraint(result.reason)).toBe('app_users_phone_hash_unique')
    }
    const owners = await data.db.select({ id: appUsers.id }).from(appUsers).where(eq(appUsers.phoneHash, hash))
    expect(owners).toHaveLength(1)
    const loser = owners[0]?.id === first.userId ? other : first
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(2)
    expect(await data.db.select({ id: appUsers.id }).from(appUsers).where(eq(appUsers.id, loser.userId))).toHaveLength(0)
  }, SLOW)
})
