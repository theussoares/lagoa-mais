import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PhoneNumberSchema } from '#shared/schemas/phone'
import { createTestPii } from '../test-support/pii'
import { TEST_DATABASE_URL, TestDatabase } from '../test-support/test-database'
import { shops } from './schema'
import { markDemoShop } from './shop-mark-demo'

// Números de teste inventados (não são de ninguém); `phone_hash` é único, então cada caso tem o seu.
const pii = createTestPii()
const hashOf = (phone: string) => pii.hashPhone(PhoneNumberSchema.parse(phone))

describe.skipIf(!TEST_DATABASE_URL)('shop:mark-demo (integration)', () => {
  let data: TestDatabase

  beforeAll(() => {
    data = new TestDatabase(TEST_DATABASE_URL as string)
  })
  afterAll(async () => {
    await data.close()
  })

  it('dry run names the shop it would mark and writes nothing (CA-40)', async () => {
    const shop = await data.createShop({ ownerPhoneHash: hashOf('67900000090') })
    const outcome = await markDemoShop(data.db, hashOf('67900000090'), { dryRun: true, actor: 'po' })
    expect(outcome).toEqual({ kind: 'wouldMark', shopId: shop.id, shopName: 'Loja de teste' })
    expect(await data.demoMarkOf(shop.id)).toEqual({ isDemo: false, markedAt: null, markedBy: null })
    expect(JSON.stringify(outcome)).not.toContain('67900000090')
  })

  it('marks the shop with who and when, and a second run changes nothing (CA-41)', async () => {
    const shop = await data.createShop({ ownerPhoneHash: hashOf('67900000091') })
    expect(await markDemoShop(data.db, hashOf('67900000091'), { dryRun: false, actor: 'po' })).toEqual({ kind: 'marked', shopId: shop.id, shopName: 'Loja de teste' })
    const first = await data.demoMarkOf(shop.id)
    expect(first).toMatchObject({ isDemo: true, markedBy: 'po' })
    expect(first.markedAt).toBeInstanceOf(Date)
    // A trilha é de quem marcou primeiro: outro operador rodando depois não a reescreve.
    expect(await markDemoShop(data.db, hashOf('67900000091'), { dryRun: false, actor: 'dev' })).toMatchObject({ kind: 'alreadyMarked', shopId: shop.id })
    // O dry-run não promete mudança que não vai acontecer (ajuste CTO).
    expect(await markDemoShop(data.db, hashOf('67900000091'), { dryRun: true, actor: 'dev' })).toMatchObject({ kind: 'alreadyMarked', shopId: shop.id })
    expect(await data.demoMarkOf(shop.id)).toEqual(first)
  })

  it('keeps the club setup trail of a shop that was born marked', async () => {
    const shop = await data.createShop({ ownerPhoneHash: hashOf('67900000094'), isDemo: true })
    const bornAt = new Date('2026-01-02T03:04:05Z')
    await data.db.update(shops).set({ demoMarkedAt: bornAt, demoMarkedBy: 'club-setup' }).where(eq(shops.id, shop.id))
    expect(await markDemoShop(data.db, hashOf('67900000094'), { dryRun: false, actor: 'po' })).toMatchObject({ kind: 'alreadyMarked' })
    expect(await data.demoMarkOf(shop.id)).toEqual({ isDemo: true, markedAt: bornAt, markedBy: 'club-setup' })
  })

  it('refuses when nobody has the demo phone, or when its owner has no shop (CA-42), touching no other shop', async () => {
    const bystander = await data.createShop()
    expect(await markDemoShop(data.db, hashOf('67900000092'), { dryRun: false, actor: 'po' })).toEqual({ kind: 'userNotFound' })
    await data.createCustomer({ phoneHash: hashOf('67900000093') })
    expect(await markDemoShop(data.db, hashOf('67900000093'), { dryRun: false, actor: 'po' })).toEqual({ kind: 'shopNotFound' })
    expect(await data.isDemoOf(bystander.id)).toBe(false)
  })
})
