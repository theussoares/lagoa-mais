const PERCENT = 100

export type HitPriceIssue = 'promoNeedsPrice' | 'promoNotLower'

interface HitPrices {
  readonly priceCents: number | null
  readonly promoPriceCents: number | null
}

/** Regra do de/por: o promocional só existe com preço normal e precisa ser menor que ele. */
export function checkHitPrices({ priceCents, promoPriceCents }: HitPrices): HitPriceIssue | null {
  if (promoPriceCents === null) return null
  if (priceCents === null) return 'promoNeedsPrice'
  return promoPriceCents < priceCents ? null : 'promoNotLower'
}

/** Promoção que vale: os dois preços e o promocional menor. `null` = sem promoção. */
function validPromo(prices: HitPrices): { priceCents: number; promoPriceCents: number } | null {
  if (checkHitPrices(prices) !== null || prices.priceCents === null || prices.promoPriceCents === null) return null
  return { priceCents: prices.priceCents, promoPriceCents: prices.promoPriceCents }
}

/** Desconto inteiro em %, arredondado para baixo (nunca promete mais do que dá). `null` = sem promoção ou menos de 1%. */
export function hitDiscountPercent(prices: HitPrices): number | null {
  const promo = validPromo(prices)
  if (promo === null) return null
  const percent = Math.floor(((promo.priceCents - promo.promoPriceCents) * PERCENT) / promo.priceCents)
  return percent >= 1 ? percent : null
}

/** O que o cliente paga: o promocional quando vale, senão o normal; `null` = sob consulta. */
export function hitEffectivePriceCents(prices: HitPrices): number | null {
  return validPromo(prices)?.promoPriceCents ?? prices.priceCents
}
