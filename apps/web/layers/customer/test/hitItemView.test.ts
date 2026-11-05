import { describe, expect, it } from 'vitest'
import type { z } from 'zod'
import { HitsBannerSchema, PublicHitItemSchema } from '#shared/schemas/showcase'
import type { PublicHitItem } from '#shared/schemas/showcase'
import type { Translate } from '#layers/core/app/types/i18n'
import { hitItemEarning, toHitItemCardModel, toHitsBannerModel } from '../app/utils/hitItemView'

/** Devolve a chave e os parâmetros: o teste vê o que a tela pediria ao pt-BR.json. */
const t: Translate = (key, named = {}, plural) =>
  [key, ...Object.entries(named).map(([name, value]) => `${name}=${String(value)}`), plural === undefined ? '' : `#${plural}`]
    .filter(Boolean)
    .join(' ')

function item(overrides: Partial<z.input<typeof PublicHitItemSchema>> = {}): PublicHitItem {
  return PublicHitItemSchema.parse({
    id: '6f1d1f8e-3c55-4d8c-9a36-0a4c0f6a2b11',
    title: 'Corte + barba',
    description: null,
    priceCents: 4500,
    promoPriceCents: null,
    tags: [],
    photoUrl: 'https://cdn.lagoa.test/hits/corte.webp',
    earning: { unit: 'stamp', units: 1, doubled: false },
    contact: null,
    shop: { id: 'shop_barbearia', name: 'Barbearia Navalha', category: 'barbershop', neighborhood: 'Centro' },
    ...overrides,
  })
}

describe('toHitItemCardModel price and tags', () => {
  it('formats the price in reais and says "Sob consulta" without one', () => {
    expect(toHitItemCardModel(item({ priceCents: 5990 }), t).price).toMatchObject({ original: null, discount: null })
    expect(toHitItemCardModel(item({ priceCents: 5990 }), t).price.price.replace(/\s/g, ' ')).toBe('R$ 59,90')
    expect(toHitItemCardModel(item({ priceCents: null }), t).price.price).toBe('hitPrice.onRequest')
  })

  it('shows de/por with the calculated percent when there is a promotion', () => {
    const { price } = toHitItemCardModel(item({ priceCents: 3990, promoPriceCents: 3490 }), t)
    expect(price.price.replace(/\s/g, ' ')).toBe('R$ 34,90')
    expect(price.original?.replace(/\s/g, ' ')).toBe('R$ 39,90')
    expect(price.discount).toBe('hitPrice.discount percent=12')
  })

  it('turns the tags into labels', () => {
    expect(toHitItemCardModel(item({ tags: ['clubOnly'] }), t).tags).toEqual([{ tag: 'clubOnly', label: 'hitTags.clubOnly' }])
  })
})

describe('hitItemEarning', () => {
  it('has no seal when the earning cannot be told', () => {
    expect(hitItemEarning(null, t)).toBeNull()
  })

  it('says how many stamps it earns and flags the surprise day', () => {
    expect(hitItemEarning({ unit: 'stamp', units: 1, doubled: true }, t)).toEqual({
      label: 'hits.earn.stamp n=1 #1',
      doubled: 'hits.earn.doubled',
    })
  })

  it('uses the points phrase and no doubled note on a normal day', () => {
    expect(hitItemEarning({ unit: 'point', units: 599, doubled: false }, t)).toEqual({ label: 'hits.earn.point n=599 #599', doubled: null })
  })
})

describe('toHitItemCardModel', () => {
  it('has no button without a contact', () => {
    expect(toHitItemCardModel(item(), t).contact).toBeNull()
  })

  it('builds the WhatsApp button with the default label', () => {
    const model = toHitItemCardModel(item({ contact: { kind: 'whatsapp', whatsapp: '67991234567', message: null, ctaLabel: null } }), t)
    expect(model.contact?.label).toBe('shopContact.defaultLabel')
    expect(model.contact?.href).toMatch(/^https:\/\/wa\.me\//)
  })

  it('keeps the label the shop chose for a link', () => {
    const model = toHitItemCardModel(item({ contact: { kind: 'url', url: 'https://barbearia.test/agendar', ctaLabel: 'Agendar' } }), t)
    expect(model.contact).toMatchObject({ label: 'Agendar', href: 'https://barbearia.test/agendar' })
  })
})

describe('toHitsBannerModel', () => {
  it('marks a paid banner as sponsored and a Pro one as featured', () => {
    expect(toHitsBannerModel(HitsBannerSchema.parse({ item: item(), sponsored: true }), t).seal).toBe('hits.sponsored')
    expect(toHitsBannerModel(HitsBannerSchema.parse({ item: item(), sponsored: false }), t).seal).toBe('hits.featured')
  })
})
