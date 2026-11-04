import { featuredPlacements } from '../database/schema'
import { NO_BONUS_RULES, type TestDatabase, type TestShop } from './test-database'

const HOUR = 3_600_000

/** Uma loja do cenário: a loja e o produto do Hits aprovado, com foto, que ela tem na vitrine. */
export interface ScenarioShop extends TestShop {
  readonly hitItemId: string
}

export interface DemoShopScenario {
  /** Loja real: tudo o que a demo tem, ela também tem, e por isso tem de aparecer (prova de que o cenário vale). */
  readonly real: ScenarioShop
  /** Loja demo (`is_demo = true`): nunca pode aparecer numa listagem pública. */
  readonly demo: ScenarioShop
}

/**
 * Cenário da spec (7.2): A real e D demo, as duas aprovadas e Fundador Pro, programa com boas-vindas e dia surpresa
 * hoje, um produto do Hits aprovado com foto e destaque pago vigente no carrossel do Descobrir e no banner do Hits.
 * D só difere de A pela marca: se D some e A aparece, quem tirou D foi o filtro da demo, não outra condição.
 * O banco de teste é compartilhado; quem confere olha presença de A e ausência de D, nunca a lista inteira.
 */
export async function createDemoShopScenario(data: TestDatabase, now: Date): Promise<DemoShopScenario> {
  const { id: adminId } = await data.createAdminUser()
  const today = now.toISOString().slice(0, 10)
  const bonusRules = {
    ...NO_BONUS_RULES,
    welcomeBonus: { enabled: true, units: 2 },
    surpriseDay: { enabled: true, multiplier: 2 as const, date: today },
  }
  const live = { startsAt: new Date(now.getTime() - 24 * HOUR), endsAt: new Date(now.getTime() + 24 * HOUR) }

  const shopLike = async (isDemo: boolean): Promise<ScenarioShop> => {
    const shop = await data.createShop({ isDemo, plan: 'founderPro', bonusRules })
    const item = await data.createHitItem(shop.id, { status: 'approved', approvedAt: new Date(now.getTime() - HOUR) })
    await data.db.insert(featuredPlacements).values([
      { shopId: shop.id, surface: 'discoverCarousel', createdByAdminId: adminId, ...live },
      { shopId: shop.id, surface: 'hitsBanner', hitItemId: item.id, createdByAdminId: adminId, ...live },
    ])
    return { ...shop, hitItemId: item.id }
  }

  return { real: await shopLike(false), demo: await shopLike(true) }
}
