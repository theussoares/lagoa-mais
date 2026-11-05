import { sql } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { TEST_DATABASE_URL, TestDatabase } from '../../test-support/test-database'

// CA-43: a 0030 entra em produção com lojas reais. Se a coluna nascesse anulável ou sem padrão, a loja antiga leria
// `null` e o filtro `is_demo = false` a tiraria da vitrine junto com a demo.
describe.skipIf(!TEST_DATABASE_URL)('shops.is_demo (integration)', () => {
  let testDb: TestDatabase

  beforeAll(() => {
    testDb = new TestDatabase(TEST_DATABASE_URL as string)
  })
  afterAll(async () => {
    await testDb.close()
  })

  it('is a NOT NULL boolean defaulting to false', async () => {
    const [column] = await testDb.db.execute<{ is_nullable: string; data_type: string; column_default: string | null }>(sql`
      select is_nullable, data_type, column_default from information_schema.columns
      where table_schema = 'public' and table_name = 'shops' and column_name = 'is_demo'`)
    expect(column).toEqual({ is_nullable: 'NO', data_type: 'boolean', column_default: 'false' })
  })

  it('reads false for a shop inserted without the field', async () => {
    const shop = await testDb.createShop()
    expect(await testDb.isDemoOf(shop.id)).toBe(false)
  })

  it('keeps the mark when a shop is inserted as demo', async () => {
    const shop = await testDb.createShop({ isDemo: true })
    expect(await testDb.isDemoOf(shop.id)).toBe(true)
  })
})
