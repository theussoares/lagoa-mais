import { describe, expect, it, vi } from 'vitest'
import type { AdminHitItemList, AdminShopList } from '#shared/schemas/admin'
import type { AdminPlacement } from '#shared/schemas/featured'
import { err, ok } from '#shared/types/result'
import { createFeaturedScreen } from '../screens/featuredScreen'
import type { AdminFeaturedService } from '../services/AdminFeaturedService'
import { hitItem, SHOP_ID, shopRow } from './fixtures'

const NOW = new Date('2026-11-10T15:00:00.000Z')

const placement: AdminPlacement = {
  id: '0190a000-0000-7000-8000-0000000007a1',
  surface: 'discoverCarousel',
  shop: { id: SHOP_ID, name: 'Padaria Lagoa' },
  hitItem: null,
  startsAt: '2026-11-11T04:00:00.000Z',
  endsAt: '2026-11-13T04:00:00.000Z',
  note: null,
  createdBy: { name: 'Ana' },
  createdAt: '2026-11-01T12:00:00.000Z',
  cancelledAt: null,
  cancelledBy: null,
}

function featured(patch: Partial<AdminFeaturedService> = {}): AdminFeaturedService {
  return {
    list: vi.fn(async () => ok({ placements: [placement], proShops: [] })),
    availability: vi.fn(async () =>
      ok({ days: [{ date: '2026-11-10', freeSlots: 2 }, { date: '2026-11-11', freeSlots: 0 }, { date: '2026-11-12', freeSlots: 1 }] }),
    ),
    create: vi.fn(async () => ok(placement)),
    cancel: vi.fn(async () => ok({ ...placement, cancelledAt: NOW.toISOString(), cancelledBy: { name: 'Ana' } })),
    ...patch,
  }
}

const shops = { list: vi.fn(async (): Promise<ReturnType<typeof ok<AdminShopList>>> => ok({ shops: [shopRow({ status: 'approved' })], nextCursor: null })) }
const hits = { list: vi.fn(async (): Promise<ReturnType<typeof ok<AdminHitItemList>>> => ok({ items: [hitItem({ status: 'approved' })], nextCursor: null })) }

async function opened(service = featured()) {
  const screen = createFeaturedScreen({ featured: service, shops, hits, now: () => NOW })
  await screen.load()
  return screen
}

describe('featured screen', () => {
  it('asks the agenda from today (local day) for the agenda window', async () => {
    const service = featured()
    await opened(service)
    expect(service.availability).toHaveBeenCalledWith({ surface: 'discoverCarousel', from: '2026-11-10', to: '2027-01-05' })
  })

  it('disables "Lançar destaque" when a day of the chosen period has no free slot', async () => {
    const screen = await opened()
    screen.change({ shopId: SHOP_ID, startDate: '2026-11-10', endDate: '2026-11-12' })
    expect(screen.fullDays).toEqual(['2026-11-11'])
    expect(screen.canLaunch).toBe(false)
    screen.change({ startDate: '2026-11-12', endDate: '2026-11-12' })
    expect(screen.fullDays).toEqual([])
    expect(screen.canLaunch).toBe(true)
  })

  it('sends the period as local midnights, the end day included', async () => {
    const service = featured()
    const screen = await opened(service)
    screen.change({ shopId: SHOP_ID, startDate: '2026-11-12', endDate: '2026-11-12', note: ' Pago no Pix ' })
    await screen.launch()
    expect(service.create).toHaveBeenCalledWith({
      shopId: SHOP_ID,
      surface: 'discoverCarousel',
      hitItemId: null,
      startsAt: '2026-11-12T04:00:00.000Z',
      endsAt: '2026-11-13T04:00:00.000Z',
      note: 'Pago no Pix',
    })
    expect(screen.message).toEqual({ tone: 'success', key: 'featured.launched' })
  })

  it('a hits banner points at an approved item, and its shop comes with it', async () => {
    const service = featured()
    const screen = await opened(service)
    await screen.switchSurface('hitsBanner')
    screen.change({ hitItemId: hitItem().id, startDate: '2026-11-12', endDate: '2026-11-12' })
    await screen.launch()
    expect(service.create).toHaveBeenCalledWith(expect.objectContaining({ surface: 'hitsBanner', hitItemId: hitItem().id, shopId: SHOP_ID }))
  })

  it('on slotsFull, refreshes the agenda and says the period is taken', async () => {
    const service = featured({ create: vi.fn(async () => err({ code: 'slotsFull' as const })) })
    const screen = await opened(service)
    screen.change({ shopId: SHOP_ID, startDate: '2026-11-12', endDate: '2026-11-12' })
    await screen.launch()
    expect(service.availability).toHaveBeenCalledTimes(2)
    expect(screen.message).toEqual({ tone: 'error', key: 'featured.errors.slotsFull' })
  })

  it('refuses an end before the start without calling the API', async () => {
    const service = featured()
    const screen = await opened(service)
    screen.change({ shopId: SHOP_ID, startDate: '2026-11-12', endDate: '2026-11-11' })
    expect(screen.canLaunch).toBe(false)
    await screen.launch()
    expect(service.create).not.toHaveBeenCalled()
  })
})
