import { hitDiscountPercent, hitEffectivePriceCents } from '#shared/domain/hitPrice'
import type { HitTag } from '#shared/domain/hitTag'
import { formatCurrency } from '#shared/utils/currency'
import type { HitPriceModel, HitTagModel } from '../types/hitPrice'
import type { Translate } from '../types/i18n'

interface HitPrices {
  readonly priceCents: number | null
  readonly promoPriceCents: number | null
}

/** O preço como o cliente vê (card e prévia do lojista): a conta do desconto é de `hitDiscountPercent`, nunca refeita aqui. */
export function toHitPriceModel(prices: HitPrices, t: Translate): HitPriceModel {
  const paid = hitEffectivePriceCents(prices)
  if (paid === null) return { price: t('hitPrice.onRequest'), original: null, discount: null }
  const percent = hitDiscountPercent(prices)
  if (percent === null || prices.priceCents === null) return { price: formatCurrency(paid), original: null, discount: null }
  return { price: formatCurrency(paid), original: formatCurrency(prices.priceCents), discount: t('hitPrice.discount', { percent }) }
}

export function toHitTagModels(tags: readonly HitTag[], t: Translate): HitTagModel[] {
  return tags.map((tag) => ({ tag, label: t(`hitTags.${tag}`) }))
}
