import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { Clock } from '../common/clock'
import { LedgerStore } from '../ledger/ledger.store'
import { createDemoShopScenario, type DemoShopScenario } from '../test-support/demo-shop-scenario'
import { PUBLIC_LISTING_ROUTES, type PublicListingRoute } from '../test-support/public-listing-routes'
import { neverExpires, TEST_DATABASE_URL, TestDatabase } from '../test-support/test-database'
import { DiscoverService } from './discover/discover.service'
import { DrizzleDiscoverRepository } from './discover/drizzle-discover.repository'
import { DrizzleCustomerHitsRepository } from './hits/drizzle-hits.repository'
import { CustomerHitsService } from './hits/hits.service'
import { DrizzleRankingRepository } from './ranking/drizzle-ranking.repository'
import { RankingService } from './ranking/ranking.service'

const SLOW = 60_000
const SUPABASE_URL = 'https://project.supabase.co'

/**
 * Como cada rota pública de listagem é chamada. `call` é o service real, com o mesmo teto que o cliente recebe: é nele
 * que a demo não pode aparecer. `realShownBy` prova que o cenário vale (a loja real aparece); nas rotas com teto (o
 * carrossel tem 8 vagas, os banners 5) ela olha o repository sem teto, porque no banco compartilhado outras lojas de
 * outros testes podem ocupar as vagas e a ausência da real não diria nada.
 */
interface Caller {
  readonly call: () => Promise<unknown>
  readonly realShownBy: (() => Promise<unknown>) | null
}

// CA-50. O tipo `Record<PublicListingRoute, Caller>` é a trava: rota nova na lista sem chamador aqui não compila.
describe.skipIf(!TEST_DATABASE_URL)('public listing sweep against a real database (CA-50)', () => {
  const now = new Date()
  const clock: Clock = { now: () => now }
  const ledger = new LedgerStore()
  let data: TestDatabase
  let scenario: DemoShopScenario
  let demoOnlyCustomer: string
  let callers: Record<PublicListingRoute, Caller>
  let ranking: RankingService

  beforeAll(async () => {
    data = new TestDatabase(TEST_DATABASE_URL as string)
    scenario = await createDemoShopScenario(data, now)
    // Cliente do ranking com visitas só na loja demo: não pode aparecer no top e a linha "você" mostra 0.
    demoOnlyCustomer = await data.createCustomer()
    await data.db.transaction(async (tx) => {
      const { demo } = scenario
      const { card } = await ledger.lockOrCreateCard(tx, { shopId: demo.id, customerId: demoOnlyCustomer, programId: demo.programId }, neverExpires())
      for (let visit = 0; visit < 5; visit += 1) {
        await ledger.credit(tx, {
          card,
          shopId: demo.id,
          customerId: demoOnlyCustomer,
          kind: 'visit',
          now: new Date(now.getTime() - (5 - visit) * 1000),
          idempotencyKey: `sweep-${demoOnlyCustomer}-${visit}`,
          plan: { welcomeUnits: 0, units: 1, appliedBonuses: [], balanceAfter: visit + 1, rewardExpiresAt: null },
        })
      }
    })
    ranking = new RankingService(new DrizzleRankingRepository(data.db), clock)
    await ranking.setConsent(demoOnlyCustomer, { granted: true, name: 'Demo Sweep' })

    const discoverRepository = new DrizzleDiscoverRepository(data.db)
    const discover = new DiscoverService(discoverRepository, { SUPABASE_URL }, clock)
    const hitsRepository = new DrizzleCustomerHitsRepository(data.db)
    const hits = new CustomerHitsService(hitsRepository, { SUPABASE_URL }, clock)
    const allHitPages = async (): Promise<unknown[]> => {
      const pages: unknown[] = []
      let cursor: string | undefined
      do {
        const page = await hits.list(cursor === undefined ? {} : { cursor })
        pages.push(page)
        cursor = page.nextCursor ?? undefined
      } while (cursor !== undefined)
      return pages
    }
    callers = {
      'GET discover/shops': { call: () => discover.listShops(), realShownBy: () => discoverRepository.listApprovedShops(10_000) },
      'GET discover/featured': { call: () => discover.listFeatured(), realShownBy: () => discoverRepository.listFeaturedShops(now, now.toISOString().slice(0, 10), 10_000) },
      'GET discover/challenges': { call: () => discover.listChallenges(), realShownBy: null },
      'GET hits': { call: allHitPages, realShownBy: allHitPages },
      'GET hits/banners': { call: () => hits.banners(), realShownBy: () => hitsRepository.listPaidBannerItems(now, 10_000) },
      'GET customer/ranking': { call: () => ranking.get(demoOnlyCustomer), realShownBy: null },
    }
  })
  afterAll(async () => data.close())

  it.each(PUBLIC_LISTING_ROUTES)('%s never shows the demo shop, nor the mark', async (route) => {
    const caller = callers[route]
    const response = JSON.stringify(await caller.call())
    expect(response).not.toContain(scenario.demo.id)
    expect(response).not.toContain(scenario.demo.hitItemId)
    expect(response).not.toMatch(/isDemo|is_demo/)
    if (caller.realShownBy !== null) expect(JSON.stringify(await caller.realShownBy())).toContain(scenario.real.id)
  }, SLOW)

  it('GET customer/ranking leaves out someone whose only visits are in the demo shop', async () => {
    const result = await ranking.get(demoOnlyCustomer)
    if (!result.ok) throw new Error('ranking expected')
    expect(result.value.me).toEqual({ optedIn: true, position: null, visits: 0, name: 'Demo Sweep' })
    expect(result.value.entries.some((entry) => entry.name === 'Demo Sweep')).toBe(false)
  }, SLOW)
})
