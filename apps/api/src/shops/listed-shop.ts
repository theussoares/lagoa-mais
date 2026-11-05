import { eq, sql, type SQL } from 'drizzle-orm'
import { shops } from '../database/schema'

/**
 * RN-06/RN-07: a loja de demonstração nunca entra em listagem pública nem em agregado da rede. Função, não constante:
 * cada consulta recebe um `SQL` próprio, sem objeto compartilhado entre queries. Referencia `shops` sem alias; quem
 * escreve SQL cru faz `join ${shops} on ...` sem alias para o fragmento casar.
 */
export function notDemoShop(): SQL {
  return eq(shops.isDemo, false)
}

/**
 * Loja que pode aparecer para quem não chegou por ela: aprovada e não demo. Montado com `sql` porque o `and()` do
 * Drizzle devolve `SQL | undefined`, e calar isso com `!` esconderia o caso. Acesso direto (QR, Carteira, Balcão,
 * resgate, indicação) não usa este filtro (RN-08).
 */
export function listedShop(): SQL {
  return sql`(${eq(shops.status, 'approved')} and ${notDemoShop()})`
}
