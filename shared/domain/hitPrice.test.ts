import { describe, expect, it } from 'vitest'
import { checkHitPrices, hitDiscountPercent, hitEffectivePriceCents } from './hitPrice'

describe('checkHitPrices', () => {
  it('accepts no promotion and a lower promo price', () => {
    expect(checkHitPrices({ priceCents: null, promoPriceCents: null })).toBeNull()
    expect(checkHitPrices({ priceCents: 3990, promoPriceCents: null })).toBeNull()
    expect(checkHitPrices({ priceCents: 3990, promoPriceCents: 3490 })).toBeNull()
  })

  it('refuses a promo price without a regular price', () => {
    expect(checkHitPrices({ priceCents: null, promoPriceCents: 3490 })).toBe('promoNeedsPrice')
  })

  it('refuses a promo price equal to or above the regular price', () => {
    expect(checkHitPrices({ priceCents: 3990, promoPriceCents: 3990 })).toBe('promoNotLower')
    expect(checkHitPrices({ priceCents: 3990, promoPriceCents: 4500 })).toBe('promoNotLower')
  })
})

describe('hitDiscountPercent', () => {
  it('rounds down, so it never promises more than the discount', () => {
    expect(hitDiscountPercent({ priceCents: 3990, promoPriceCents: 3490 })).toBe(12)
    expect(hitDiscountPercent({ priceCents: 10_000, promoPriceCents: 5000 })).toBe(50)
  })

  it('is null without a valid promotion or when it is under 1%', () => {
    expect(hitDiscountPercent({ priceCents: 3990, promoPriceCents: null })).toBeNull()
    expect(hitDiscountPercent({ priceCents: null, promoPriceCents: 3490 })).toBeNull()
    expect(hitDiscountPercent({ priceCents: 3990, promoPriceCents: 4000 })).toBeNull()
    expect(hitDiscountPercent({ priceCents: 10_000, promoPriceCents: 9_950 })).toBeNull()
  })
})

describe('hitEffectivePriceCents', () => {
  it('is the promo price when it holds, the regular price otherwise, null for on request', () => {
    expect(hitEffectivePriceCents({ priceCents: 3990, promoPriceCents: 3490 })).toBe(3490)
    expect(hitEffectivePriceCents({ priceCents: 3990, promoPriceCents: 5000 })).toBe(3990)
    expect(hitEffectivePriceCents({ priceCents: 3990, promoPriceCents: null })).toBe(3990)
    expect(hitEffectivePriceCents({ priceCents: null, promoPriceCents: null })).toBeNull()
  })
})
