/**
 * LIMITE (Mo-2): a varredura só olha `GET`. Rota `POST`/`PUT` que devolva lista pública de lojas ou produtos (busca por
 * corpo, por exemplo) passa por ela sem ser vista: precisa de classificação manual aqui (e de `listedShop()` no
 * repository) e de um teste próprio provando que a loja demo não aparece. Job ou arquivo estático gerado também não
 * entram na varredura.
 *
 * Toda rota `GET` fora de `admin/*` e `merchant/*` está numa destas listas, por escrito (RN-06/RN-08). Rota nova quebra
 * `customer/public-listing.sweep.test.ts` até alguém decidir: se lista loja ou produto para quem não chegou pela loja,
 * entra em `PUBLIC_LISTING_ROUTES` e o repository usa `listedShop()`/`notDemoShop()`; se é acesso direto ou dado do
 * próprio cliente, entra em `DIRECT_ACCESS_ROUTES` com o motivo.
 */
export const PUBLIC_LISTING_ROUTES = [
  'GET discover/shops',
  'GET discover/featured',
  'GET discover/challenges',
  'GET hits',
  'GET hits/banners',
  'GET customer/ranking',
] as const

export type PublicListingRoute = (typeof PUBLIC_LISTING_ROUTES)[number]

export const DIRECT_ACCESS_ROUTES: Readonly<Record<string, string>> = {
  'GET wallet/cards': 'Carteira: cartões do próprio cliente; a demo aparece para quem tem cartão nela (RN-08).',
  'GET wallet/cards/:shopId': 'Carteira: cartão do próprio cliente numa loja (RN-08).',
  'GET wallet/activity': 'Carteira: caderneta do próprio cliente (RN-08).',
  'GET wallet/rewards': 'Carteira: prêmios do próprio cliente (RN-08).',
  'GET redemptions/:id': 'Resgate gerado pelo próprio cliente (RN-08).',
  'GET referrals/me': 'Indicação do próprio cliente (RN-08).',
  'GET customer/session': 'Sessão do próprio cliente; não lista loja.',
  'GET customer/profile': 'Perfil do próprio cliente; não lista loja.',
  'GET customer/data-export': 'Exportação LGPD dos dados do próprio cliente, inclusive cartões em loja demo.',
  'GET health': 'Saúde da API; não lê loja.',
}

/** Caminho do painel do lojista ou da rede: tem as próprias varreduras e enxerga a demo de propósito. */
const isPanelRoute = (route: string): boolean => /^GET (admin|merchant)(\/|$)/.test(route)

/** `GET` fora dos painéis que ninguém classificou. */
export function unclassifiedGetRoutes(routes: readonly string[]): string[] {
  const classified = new Set<string>([...PUBLIC_LISTING_ROUTES, ...Object.keys(DIRECT_ACCESS_ROUTES)])
  return routes.filter((route) => route.startsWith('GET ') && !isPanelRoute(route) && !classified.has(route))
}

/** Rota classificada que não existe mais: a lista mente sobre o que está protegido. */
export function staleClassifiedRoutes(routes: readonly string[]): string[] {
  const existing = new Set(routes)
  return [...PUBLIC_LISTING_ROUTES, ...Object.keys(DIRECT_ACCESS_ROUTES)].filter((route) => !existing.has(route))
}
