import { describe, expect, it } from 'vitest'
import type { MerchantHitItem } from '#shared/schemas/hitItem'
import type { Translate } from '#layers/core/app/types/i18n'
import { emptyHitItemForm, formFromItem, parsePriceCents, saveErrorOf, toHitItemDraft, toHitItemPreview, toHitItemRow, toggleHitTag } from '../app/utils/hitItemForm'

const now = new Date(2026, 9, 19, 10, 0, 0)
const t: Translate = (key, named = {}) => [key, ...Object.entries(named).map(([name, value]) => `${name}=${String(value)}`)].join(' ')
const filled = { ...emptyHitItemForm(), title: '  Corte masculino ' }

const item: MerchantHitItem = {
  id: '0190b0c0-1111-7000-8000-000000000001',
  title: 'Corte',
  description: 'Na régua',
  priceCents: 4550,
  promoPriceCents: null,
  tags: [],
  contact: { kind: 'url', url: 'https://loja.com/x', ctaLabel: 'Comprar agora' },
  endsAt: new Date(2026, 10, 30, 23, 59, 59).toISOString(),
  status: 'approved',
  rejectionReason: null,
  photoUrl: 'https://cdn.test/a.webp',
  createdAt: '2026-10-01T12:00:00.000Z',
  updatedAt: '2026-10-01T12:00:00.000Z',
}

describe('parsePriceCents', () => {
  it.each([
    ['12,50', 1250],
    ['R$ 1.250,00', 125000],
    ['12.5', 1250],
    ['7', 700],
    ['', null],
  ])('reads %j', (text, cents) => expect(parsePriceCents(text)).toBe(cents))

  it.each(['abc', '0', '-3', '1,234', '999999999'])('refuses %j', (text) => expect(parsePriceCents(text)).toBeUndefined())
})

describe('toHitItemDraft', () => {
  it('trims, turns blanks into null and uses the shop button by default', () => {
    expect(toHitItemDraft(filled, now)).toEqual({
      ok: true,
      draft: { title: 'Corte masculino', description: null, priceCents: null, promoPriceCents: null, tags: [], contact: null, endsAt: null },
    })
  })

  it('ends the product at the end of the chosen local day, and refuses a day already gone', () => {
    const result = toHitItemDraft({ ...filled, endsAt: '2026-10-19' }, now)
    expect(result.ok && result.draft.endsAt).toBe(new Date(2026, 9, 19, 23, 59, 59).toISOString())
    expect(toHitItemDraft({ ...filled, endsAt: '2026-10-18' }, now)).toEqual({ ok: false, code: 'invalidEndsAt' })
    expect(toHitItemDraft({ ...filled, endsAt: '2026-02-31' }, now)).toEqual({ ok: false, code: 'invalidEndsAt' })
  })

  it('asks for the name and a valid price', () => {
    expect(toHitItemDraft({ ...filled, title: '   ' }, now)).toEqual({ ok: false, code: 'missingTitle' })
    expect(toHitItemDraft({ ...filled, price: 'muito' }, now)).toEqual({ ok: false, code: 'invalidPrice' })
  })

  it('validates the own button like the shop button screen does', () => {
    const own = { ...filled, useShopButton: false }
    expect(toHitItemDraft(own, now)).toEqual({ ok: false, code: 'invalidWhatsapp' })
    const withNumber = { ...own, contact: { ...own.contact, whatsapp: '(67) 99123-4567' } }
    expect(toHitItemDraft(withNumber, now)).toMatchObject({ ok: true, draft: { contact: { kind: 'whatsapp', whatsapp: '67991234567' } } })
  })
})

describe('promo price and tags in the draft', () => {
  const promo = { ...filled, price: '39,90', promoPrice: '34,90', tags: ['clubOnly' as const] }

  it('sends the promo price and the tags, and never a discount percent', () => {
    const result = toHitItemDraft(promo, now)
    expect(result).toMatchObject({ ok: true, draft: { priceCents: 3990, promoPriceCents: 3490, tags: ['clubOnly'] } })
    expect(result.ok && 'discountPercent' in result.draft).toBe(false)
  })

  it('refuses a promo price that is not a price, without the regular price, or not lower', () => {
    expect(toHitItemDraft({ ...promo, promoPrice: 'barato' }, now)).toEqual({ ok: false, code: 'invalidPromoPrice' })
    expect(toHitItemDraft({ ...promo, price: '' }, now)).toEqual({ ok: false, code: 'promoNeedsPrice' })
    expect(toHitItemDraft({ ...promo, promoPrice: '39,90' }, now)).toEqual({ ok: false, code: 'promoNotLower' })
    expect(toHitItemDraft({ ...promo, promoPrice: '50' }, now)).toEqual({ ok: false, code: 'promoNotLower' })
  })

  it('round-trips a saved promotion and tags through the form', () => {
    const saved = { ...item, priceCents: 3990, promoPriceCents: 3490, tags: ['new' as const, 'lastUnits' as const] }
    expect(formFromItem(saved)).toMatchObject({ price: '39,90', promoPrice: '34,90', tags: ['new', 'lastUnits'] })
    expect(toHitItemDraft(formFromItem(saved), new Date(2026, 9, 19))).toMatchObject({ ok: true, draft: { promoPriceCents: 3490, tags: ['new', 'lastUnits'] } })
  })

  it('toggles a tag keeping the card order', () => {
    expect(toggleHitTag(['lastUnits'], 'clubOnly')).toEqual(['clubOnly', 'lastUnits'])
    expect(toggleHitTag(['clubOnly', 'lastUnits'], 'clubOnly')).toEqual(['lastUnits'])
  })
})

describe('toHitItemPreview', () => {
  it('shows the old price, the new one and the percent while typing, and drops a promo that makes no sense', () => {
    const typed = { ...filled, price: '39,90', promoPrice: '34,90', tags: ['clubOnly' as const] }
    const preview = toHitItemPreview(typed, null, 'Chamar', t)
    expect(preview.price).toMatchObject({ original: expect.stringMatching(/39,90/), discount: 'hitPrice.discount percent=12' })
    expect(preview.price.price).toMatch(/34,90/)
    expect(preview.tags).toEqual([{ tag: 'clubOnly', label: 'hitTags.clubOnly' }])
    expect(toHitItemPreview({ ...typed, promoPrice: '45' }, null, 'Chamar', t).price).toMatchObject({ original: null, discount: null })
    expect(toHitItemPreview({ ...filled }, null, 'Chamar', t).price.price).toBe('hitPrice.onRequest')
  })
})

describe('formFromItem', () => {
  it('round-trips a saved item through the form', () => {
    const result = toHitItemDraft(formFromItem(item), new Date(2026, 9, 19))
    expect(result).toEqual({
      ok: true,
      draft: { title: 'Corte', description: 'Na régua', priceCents: 4550, promoPriceCents: null, tags: [], contact: item.contact, endsAt: item.endsAt },
    })
  })

  it('marks an item without its own button as using the shop button', () => {
    expect(formFromItem({ ...item, contact: null }).useShopButton).toBe(true)
  })
})

describe('toHitItemRow', () => {
  it('shows the reason only on rejected items and flags a missing photo', () => {
    expect(toHitItemRow({ ...item, status: 'rejected', rejectionReason: 'Foto escura' }, t).rejectionReason).toBe('Foto escura')
    expect(toHitItemRow(item, t).rejectionReason).toBeNull()
    expect(toHitItemRow({ ...item, photoUrl: null }, t).missingPhoto).toBe(true)
    expect(toHitItemRow({ ...item, photoUrl: null, status: 'archived' }, t)).toMatchObject({ missingPhoto: false, canEdit: false })
    expect(toHitItemRow(item, t).price.price).toMatch(/45,50/)
  })
})

describe('saveErrorOf', () => {
  it('splits field errors from general ones', () => {
    expect(saveErrorOf({ status: 'error', code: 'invalidPrice' })).toEqual({ field: 'invalidPrice', key: null })
    expect(saveErrorOf({ status: 'error', code: 'limitReached' })).toEqual({ field: null, key: 'errors.limitReached' })
    expect(saveErrorOf({ status: 'error', code: 'unreadable' })).toEqual({ field: null, key: 'merchantHits.errors.unreadable' })
    expect(saveErrorOf({ status: 'idle' })).toEqual({ field: null, key: null })
  })
})
