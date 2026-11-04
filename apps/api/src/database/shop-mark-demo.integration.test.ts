import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PhoneNumberSchema } from '#shared/schemas/phone'
import { createTestPii } from '../test-support/pii'
import { TEST_DATABASE_URL, TestDatabase } from '../test-support/test-database'
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
    const outcome = await markDemoShop(data.db, hashOf('67900000090'), { dryRun: true })
    expect(outcome).toEqual({ kind: 'wouldMark', shopId: shop.id, shopName: 'Loja de teste' })
    expect(await data.isDemoOf(shop.id)).toBe(false)
    expect(JSON.stringify(outcome)).not.toContain('67900000090')
  })

  it('marks the shop, and a second run changes nothing (CA-41)', async () => {
    const shop = await data.createShop({ ownerPhoneHash: hashOf('67900000091') })
    expect(await markDemoShop(data.db, hashOf('67900000091'), { dryRun: false })).toEqual({ kind: 'marked', shopId: shop.id, shopName: 'Loja de teste' })
    expect(await data.isDemoOf(shop.id)).toBe(true)
    expect(await markDemoShop(data.db, hashOf('67900000091'), { dryRun: false })).toMatchObject({ kind: 'alreadyMarked', shopId: shop.id })
    // O dry-run não promete mudança que não vai acontecer (ajuste CTO).
    expect(await markDemoShop(data.db, hashOf('67900000091'), { dryRun: true })).toMatchObject({ kind: 'alreadyMarked', shopId: shop.id })
    expect(await data.isDemoOf(shop.id)).toBe(true)
  })

  it('refuses when nobody has the demo phone, or when its owner has no shop (CA-42), touching no other shop', async () => {
    const bystander = await data.createShop()
    expect(await markDemoShop(data.db, hashOf('67900000092'), { dryRun: false })).toEqual({ kind: 'userNotFound' })
    await data.createCustomer({ phoneHash: hashOf('67900000093') })
    expect(await markDemoShop(data.db, hashOf('67900000093'), { dryRun: false })).toEqual({ kind: 'shopNotFound' })
    expect(await data.isDemoOf(bystander.id)).toBe(false)
  })
})
