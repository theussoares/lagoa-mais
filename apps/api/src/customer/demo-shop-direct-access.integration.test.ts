import { and, eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { SystemClock } from '../common/clock'
import { loyaltyCards, referrals, shops } from '../database/schema'
import { DrizzleReferralSettlement } from '../ledger/drizzle-referral-settlement'
import { LedgerStore } from '../ledger/ledger.store'
import { RedemptionLookup } from '../ledger/redemption-lookup'
import { CounterRedemptionsService } from '../merchant/counter/counter-redemptions.service'
import { DrizzleCounterRepository } from '../merchant/counter/drizzle-counter.repository'
import { claimVisit } from '../test-support/claim-visit'
import { createTestPii } from '../test-support/pii'
import { NO_BONUS_RULES, TEST_DATABASE_URL, TestDatabase, type TestShop } from '../test-support/test-database'
import { CheckInService } from './check-in/check-in.service'
import { DrizzleCheckInRepository } from './check-in/drizzle-check-in.repository'
import { DrizzleRedemptionRepository } from './redemption/drizzle-redemption.repository'
import { RedemptionService } from './redemption/redemption.service'
import { DrizzleReferralRepository } from './referral/drizzle-referral.repository'
import { ReferralService } from './referral/referral.service'
import { DrizzleShopJoinRepository } from './shop-join/drizzle-shop-join.repository'
import { ShopJoinService } from './shop-join/shop-join.service'
import { DrizzleWalletRepository } from './wallet/drizzle-wallet.repository'
import { WalletService } from './wallet/wallet.service'

const SLOW = 60_000
const REFERRAL_ON = { ...NO_BONUS_RULES, referralBonus: { enabled: true, units: 1 } }

/**
 * RN-08: quem chega pela loja (QR da loja, QR da visita, código curto, Carteira, resgate no Balcão, indicação) não olha
 * `is_demo`. Cada fluxo roda numa loja real e numa demo gêmeas (mesma situação, mesmo programa) e o resultado tem de
 * ser o mesmo; um filtro de listagem posto por engano num desses caminhos quebraria a apresentação da demo.
 */
describe.skipIf(!TEST_DATABASE_URL)('demo shop direct access against a real database', () => {
  const pii = createTestPii()
  const ledger = new LedgerStore()
  const clock = new SystemClock()
  let data: TestDatabase
  let checkIn: CheckInService
  let shopJoin: ShopJoinService
  let wallet: WalletService
  let redemptions: RedemptionService
  let counter: CounterRedemptionsService
  let referralService: ReferralService

  beforeAll(() => {
    data = new TestDatabase(TEST_DATABASE_URL as string)
    checkIn = new CheckInService(new DrizzleCheckInRepository(data.db, ledger), clock, new DrizzleReferralSettlement(data.db, ledger))
    shopJoin = new ShopJoinService(new DrizzleShopJoinRepository(data.db, ledger), clock)
    wallet = new WalletService(new DrizzleWalletRepository(data.db), { SUPABASE_URL: 'https://project.supabase.co' }, clock)
    redemptions = new RedemptionService(new DrizzleRedemptionRepository(data.db, ledger), clock)
    counter = new CounterRedemptionsService(new DrizzleCounterRepository(data.db, ledger, pii, new RedemptionLookup(data.db)), clock)
    referralService = new ReferralService(new DrizzleReferralRepository(data.db))
  })
  afterAll(async () => data.close())

  type Options = Parameters<TestDatabase['createShop']>[0]
  /** Loja real e loja demo com a mesma configuração. */
  const twins = async (options: Options = {}): Promise<{ real: TestShop; demo: TestShop }> => ({
    real: await data.createShop({ ...options, isDemo: false }),
    demo: await data.createShop({ ...options, isDemo: true }),
  })
  /** Cliente com celular cifrado conhecido (inventado), para o Balcão conseguir mascarar. */
  const customer = async (): Promise<string> => {
    const id = await data.createCustomer()
    await data.setPhone(id, pii.encrypt('67900000070'))
    return id
  }
  const ownerOf = async (shop: TestShop): Promise<string> => {
    const [row] = await data.db.select({ owner: shops.ownerUserId }).from(shops).where(eq(shops.id, shop.id))
    if (!row) throw new Error('shop expected')
    return row.owner
  }
  const cardOf = async (shop: TestShop, customerId: string) => {
    const [card] = await data.db.select().from(loyaltyCards).where(and(eq(loyaltyCards.shopId, shop.id), eq(loyaltyCards.customerId, customerId)))
    if (!card) throw new Error('card expected')
    return card
  }
  /** O que importa comparar de um `Result`: deu certo ou o código do erro. */
  const outcome = (result: { ok: true } | { ok: false; error: { code: string } }): string => (result.ok ? 'ok' : result.error.code)

  it('shows the demo card in the Wallet of whoever has one (CA-14, Wallet part)', async () => {
    const { demo } = await twins()
    const me = await customer()
    expect(await claimVisit(data, checkIn, me, demo)).toMatchObject({ ok: true })
    const cards = await wallet.listCards(me)
    expect(cards.ok && cards.value.map((card) => card.shopId)).toContain(demo.id)
    expect(await wallet.getCard(me, demo.id)).toMatchObject({ ok: true, value: { shopId: demo.id } })
  }, SLOW)

  it('joins the demo club by the shop QR code, like a real shop (CA-15)', async () => {
    const { real, demo } = await twins()
    const me = await customer()
    const [ofReal, ofDemo] = [await shopJoin.joinShop(me, real.checkInCode), await shopJoin.joinShop(me, demo.checkInCode)]
    expect(ofReal).toMatchObject({ ok: true, value: { shopId: real.id, alreadyMember: false } })
    expect(ofDemo).toMatchObject({ ok: true, value: { shopId: demo.id, alreadyMember: false } })
    expect((await cardOf(demo, me)).balance).toBe(0)
  }, SLOW)

  it('earns with the visit QR token and the short code, under the same anti-fraud window (CA-16)', async () => {
    const { real, demo } = await twins({ cooldownHours: 24 })
    for (const shop of [real, demo]) {
      const byToken = await customer()
      expect(await claimVisit(data, checkIn, byToken, shop)).toMatchObject({ ok: true })
      // Segunda visita dentro da janela: recusada igual nas duas lojas.
      expect(outcome(await claimVisit(data, checkIn, byToken, shop))).toBe('checkInCooldown')

      const byCode = await customer()
      const qr = await data.createVisitQr({ shopId: shop.id })
      expect(await checkIn.claimVisitQr(byCode, { visitCode: qr.visitCode })).toMatchObject({ ok: true })
      expect((await cardOf(shop, byCode)).balance).toBe(1)
    }
  }, SLOW)

  it('redeems a reward of the demo shop: the customer asks for the code and the demo counter confirms (CA-17)', async () => {
    const { real, demo } = await twins({ rules: { mode: 'stamps', target: 3 }, cooldownMode: 'unlimited' })
    for (const shop of [real, demo]) {
      const me = await customer()
      for (let visit = 0; visit < 3; visit += 1) expect(await claimVisit(data, checkIn, me, shop)).toMatchObject({ ok: true })
      const requested = await redemptions.requestCode(me, (await cardOf(shop, me)).id)
      if (!requested.ok) throw new Error(`redemption code expected for ${shop.id}`)
      const owner = await ownerOf(shop)
      const preview = await counter.validateRedemption(owner, requested.value.code)
      if (!preview.ok) throw new Error(`counter preview expected for ${shop.id}`)
      expect(preview.value.maskedPhone).toBe('(67) 9••••-0070')
      expect(await counter.confirmRedemption(owner, preview.value.redemptionId)).toMatchObject({ ok: true, value: { kind: 'redemption' } })
      expect((await cardOf(shop, me)).balance).toBe(0)
    }
  }, SLOW)

  it('settles a referral to the demo shop on the first visit of the friend (CA-18)', async () => {
    const { real, demo } = await twins({ bonusRules: REFERRAL_ON })
    for (const shop of [real, demo]) {
      const [referrer, friend] = [await customer(), await customer()]
      expect(await referralService.capture(friend, await data.referralCodeOf(referrer), shop.checkInCode)).toEqual({ ok: true, value: undefined })
      expect(await claimVisit(data, checkIn, friend, shop)).toMatchObject({ ok: true })
      const [row] = await data.db.select({ status: referrals.status }).from(referrals).where(and(eq(referrals.shopId, shop.id), eq(referrals.referredId, friend)))
      expect(row?.status).toBe('rewarded')
      expect((await cardOf(shop, referrer)).balance).toBe(1)
    }
  }, SLOW)

  it('refuses a suspended demo shop exactly like any suspended shop (CA-20)', async () => {
    const { real, demo } = await twins({ rules: { mode: 'stamps', target: 3 }, cooldownMode: 'unlimited' })
    const outcomes = async (shop: TestShop): Promise<Record<string, string>> => {
      const member = await customer()
      for (let visit = 0; visit < 3; visit += 1) await claimVisit(data, checkIn, member, shop)
      const ready = (await cardOf(shop, member)).id
      const owner = await ownerOf(shop)
      const earlyCode = await redemptions.requestCode(member, ready)
      await data.db.update(shops).set({ status: 'suspended' }).where(eq(shops.id, shop.id))
      return {
        join: outcome(await shopJoin.joinShop(await customer(), shop.checkInCode)),
        checkIn: outcome(await claimVisit(data, checkIn, await customer(), shop)),
        counter: earlyCode.ok ? outcome(await counter.validateRedemption(owner, earlyCode.value.code)) : `request:${earlyCode.error.code}`,
      }
    }
    const ofReal = await outcomes(real)
    const ofDemo = await outcomes(demo)
    expect(ofDemo).toEqual(ofReal)
    // A loja suspensa recusa ao menos um desses caminhos hoje; senão a comparação não provaria nada.
    expect(Object.values(ofReal).some((value) => value !== 'ok')).toBe(true)
  }, SLOW)
})
