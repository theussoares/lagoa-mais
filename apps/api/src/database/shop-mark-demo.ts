import { and, eq, sql } from 'drizzle-orm'
import type { Database } from './database.module'
import { appUsers, shops } from './schema'

export type MarkDemoShopOutcome =
  | { readonly kind: 'marked' | 'alreadyMarked' | 'wouldMark'; readonly shopId: string; readonly shopName: string }
  | { readonly kind: 'userNotFound' | 'shopNotFound' }

/**
 * Backfill da loja demo que nasceu antes da coluna (RN-09). Numa transação: acha o dono pelo `phone_hash` (o mesmo
 * `PiiService.hashPhone` do cadastro), trava a loja dele (`FOR UPDATE`) e liga `is_demo`. Idempotente. O alvo sai sempre
 * do número demo, nunca de um id digitado, para um id trocado não esconder loja real. O dry-run passa pelo mesmo
 * caminho (inclusive o lock) e só não escreve: assim ele não promete uma mudança diferente da que o modo real faria.
 * A trilha (`demo_marked_at` pelo relógio do banco, `demo_marked_by` = apelido do operador) entra no mesmo UPDATE da marca
 * e nunca é reescrita: loja já marcada (pelo Criar o clube ou por outra rodada) sai `alreadyMarked` sem escrever nada.
 */
export async function markDemoShop(
  db: Pick<Database, 'transaction'>,
  demoPhoneHash: Buffer,
  options: { readonly dryRun: boolean; readonly actor: string },
): Promise<MarkDemoShopOutcome> {
  return db.transaction(async (tx): Promise<MarkDemoShopOutcome> => {
    const [owner] = await tx.select({ id: appUsers.id }).from(appUsers).where(eq(appUsers.phoneHash, demoPhoneHash)).limit(1)
    if (!owner) return { kind: 'userNotFound' }
    const [shop] = await tx
      .select({ id: shops.id, name: shops.name, isDemo: shops.isDemo })
      .from(shops)
      .where(eq(shops.ownerUserId, owner.id))
      .for('update')
    if (!shop) return { kind: 'shopNotFound' }
    const target = { shopId: shop.id, shopName: shop.name }
    if (shop.isDemo) return { kind: 'alreadyMarked', ...target }
    if (options.dryRun) return { kind: 'wouldMark', ...target }
    // `is_demo = false` no WHERE além do `FOR UPDATE`: a trilha de quem marcou primeiro não pode ser sobrescrita.
    await tx
      .update(shops)
      .set({ isDemo: true, demoMarkedAt: sql`now()`, demoMarkedBy: options.actor })
      .where(and(eq(shops.id, shop.id), eq(shops.isDemo, false)))
    return { kind: 'marked', ...target }
  })
}
