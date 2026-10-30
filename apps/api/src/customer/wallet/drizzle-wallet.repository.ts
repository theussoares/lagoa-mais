import { Inject, Injectable } from '@nestjs/common'
import { and, desc, eq, inArray, type SQL, sql } from 'drizzle-orm'
import { z } from 'zod'
import { WALLET_CARDS_LIMIT } from '#shared/constants/domain'
import { withActiveSurpriseDay } from '#shared/domain/bonusRules'
import { type BonusRules, BonusRulesSchema } from '#shared/schemas/program'
import { DB, type Database } from '../../database/database.module'
import { ledgerEntries, loyaltyCards, programs, redemptions, shops } from '../../database/schema'
import { CATALOG_COLUMNS, toCatalogShop } from '../../shops/catalog-row'
import { type EarnedEntry, isEarnedKind } from './stamps'
import {
  type ActivityKind,
  type ActivityRecord,
  isActivityKind,
  type WalletCardRecord,
  WalletRepository,
} from './wallet.repository'

const CARD_COLUMNS = {
  cardId: loyaltyCards.id,
  programId: loyaltyCards.programId,
  balance: loyaltyCards.balance,
  lastVisitAt: loyaltyCards.lastVisitAt,
  lastActivityAt: loyaltyCards.lastActivityAt,
  rewardExpiresAt: loyaltyCards.rewardExpiresAt,
  ...CATALOG_COLUMNS,
}

@Injectable()
export class DrizzleWalletRepository extends WalletRepository {
  constructor(@Inject(DB) private readonly db: Database) {
    super()
  }

  async listCards(customerId: string): Promise<WalletCardRecord[]> {
    return this.readCards(customerId, undefined, WALLET_CARDS_LIMIT)
  }

  async findCard(customerId: string, shopId: string): Promise<WalletCardRecord | null> {
    const [card] = await this.readCards(customerId, eq(loyaltyCards.shopId, shopId), 1)
    return card ?? null
  }

  async listActivity(customerId: string, kinds: readonly ActivityKind[], limit: number): Promise<ActivityRecord[]> {
    const rows = await this.db
      .select({
        id: ledgerEntries.id,
        shopId: ledgerEntries.shopId,
        shopName: shops.name,
        kind: ledgerEntries.kind,
        unit: programs.unit,
        unitsDelta: ledgerEntries.unitsDelta,
        rewardTitle: redemptions.rewardTitle,
        occurredAt: ledgerEntries.occurredAt,
      })
      .from(ledgerEntries)
      .innerJoin(shops, eq(shops.id, ledgerEntries.shopId))
      .innerJoin(loyaltyCards, eq(loyaltyCards.id, ledgerEntries.cardId))
      .innerJoin(programs, eq(programs.id, loyaltyCards.programId))
      .leftJoin(redemptions, eq(redemptions.id, ledgerEntries.redemptionId))
      .where(and(eq(ledgerEntries.customerId, customerId), inArray(ledgerEntries.kind, [...kinds])))
      .orderBy(sql`${ledgerEntries.occurredAt} desc nulls last`, sql`${ledgerEntries.id} desc nulls last`)
      .limit(limit)
    return rows.flatMap((row) => (isActivityKind(row.kind) ? [{ ...row, kind: row.kind }] : []))
  }

  /** Cartões em uma consulta e as casas de todos os cartões de carimbos em outra: sem N+1. */
  private async readCards(customerId: string, extra: SQL | undefined, limit: number): Promise<WalletCardRecord[]> {
    const rows = await this.db
      .select(CARD_COLUMNS)
      .from(loyaltyCards)
      .innerJoin(shops, eq(shops.id, loyaltyCards.shopId))
      .innerJoin(programs, eq(programs.id, loyaltyCards.programId))
      // O dono do cartão é parte da assinatura: nenhum chamador consegue esquecer o filtro.
      .where(and(eq(loyaltyCards.customerId, customerId), extra, eq(shops.status, 'approved')))
      .orderBy(sql`${loyaltyCards.lastVisitAt} desc nulls last`, desc(loyaltyCards.id))
      .limit(limit)

    const surpriseDays = await this.readActiveSurpriseDays(rows.map((row) => row.shopId))
    const cards = rows.flatMap((row) => {
      const parsed = toCatalogShop(row)
      if (parsed === null) return []
      // O dia surpresa é da loja: o selo vale também para o cartão que segue numa versão anterior.
      const active = surpriseDays.get(parsed.id)
      const shop = active
        ? { ...parsed, program: { ...parsed.program, bonusRules: withActiveSurpriseDay(parsed.program.bonusRules, active) } }
        : parsed
      return [{ row, shop }]
    })
    const stampCards = cards.filter(({ shop }) => shop.program.rules.mode === 'stamps')
    const earnedByCard = await this.readEarned(stampCards.map(({ row }) => ({ cardId: row.cardId, balance: row.balance })))

    return cards.map(({ row, shop }) => ({
      cardId: row.cardId,
      programId: row.programId,
      balance: row.balance,
      lastVisitAt: row.lastVisitAt,
      lastActivityAt: row.lastActivityAt,
      rewardExpiresAt: row.rewardExpiresAt,
      shop,
      earned: earnedByCard.get(row.cardId) ?? [],
    }))
  }

  /** Uma consulta para o dia surpresa da versão ativa de cada loja dos cartões (sem N+1). */
  private async readActiveSurpriseDays(shopIds: readonly string[]): Promise<Map<string, BonusRules['surpriseDay']>> {
    const result = new Map<string, BonusRules['surpriseDay']>()
    if (shopIds.length === 0) return result
    const rows = await this.db
      .select({ shopId: programs.shopId, bonusRules: programs.bonusRules })
      .from(programs)
      .where(and(inArray(programs.shopId, [...new Set(shopIds)]), eq(programs.active, true)))
    for (const row of rows) {
      const parsed = BonusRulesSchema.safeParse(row.bonusRules)
      if (parsed.success) result.set(row.shopId, parsed.data.surpriseDay)
    }
    return result
  }

  /**
   * Para cada cartão, as linhas positivas mais novas. Cada linha vale ao menos 1 unidade, então
   * `balance` linhas bastam para cobrir o saldo. O `LATERAL ... LIMIT` percorre o índice
   * (card_id, occurred_at DESC) só até `balance` linhas por cartão: o custo não cresce com o histórico.
   */
  private async readEarned(cards: readonly { cardId: string; balance: number }[]): Promise<Map<string, EarnedEntry[]>> {
    const result = new Map<string, EarnedEntry[]>()
    const withBalance = cards.filter(({ balance }) => balance > 0)
    if (withBalance.length === 0) return result

    const ids = sql.join(withBalance.map(({ cardId }) => sql`${cardId}`), sql`, `)
    const balances = sql.join(withBalance.map(({ balance }) => sql`${balance}`), sql`, `)
    const rows = await this.db.execute(sql`
      select wanted.card_id, recent.id, recent.kind, recent.units_delta, recent.occurred_at
      from unnest(array[${ids}]::uuid[], array[${balances}]::int[]) as wanted(card_id, balance)
      cross join lateral (
        select id, kind, units_delta, occurred_at
        from ledger_entries
        where card_id = wanted.card_id and units_delta > 0
        order by occurred_at desc nulls last, id desc nulls last
        limit wanted.balance
      ) as recent
      order by wanted.card_id, recent.occurred_at desc nulls last, recent.id desc nulls last
    `)

    for (const raw of rows) {
      const row = EarnedRowSchema.safeParse(raw)
      if (!row.success || !isEarnedKind(row.data.kind)) continue
      const { card_id: cardId, kind, units_delta: units, occurred_at: occurredAt } = row.data
      result.set(cardId, [...(result.get(cardId) ?? []), { kind, units, occurredAt }])
    }
    return result
  }
}

const EarnedRowSchema = z.object({
  card_id: z.string(),
  kind: z.string(),
  units_delta: z.number().int().positive(),
  occurred_at: z.coerce.date(),
})

