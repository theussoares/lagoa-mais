import { describe, expect, it, vi } from 'vitest'
import { err, ok } from '#shared/types/result'
import { createHitsScreen } from '../screens/hitsScreen'
import type { AdminHitsService } from '../services/AdminHitsService'
import { hitItem } from './fixtures'

const OTHER_ID = '0190a000-0000-7000-8000-0000000001a2'

function service(patch: Partial<AdminHitsService> = {}): AdminHitsService {
  return {
    list: vi.fn(async () => ok({ items: [hitItem(), hitItem({ id: OTHER_ID, title: 'Bolo' })], nextCursor: null })),
    review: vi.fn(async () => ok(hitItem({ status: 'approved' }))),
    ...patch,
  }
}

describe('hits screen', () => {
  it('approves with the version it showed, and drops the item from the queue', async () => {
    const hits = service()
    const screen = createHitsScreen(hits)
    await screen.load()
    await screen.approve(hitItem().id)
    expect(hits.review).toHaveBeenCalledWith(hitItem().id, { action: 'approve', expectedVersion: 1 })
    expect(screen.items.map((item) => item.id)).toEqual([OTHER_ID])
    expect(screen.message).toEqual({ tone: 'success', key: 'hits.approved' })
  })

  it('on conflict (the merchant changed the item), reloads the queue and says so', async () => {
    const hits = service({ review: vi.fn(async () => err({ code: 'conflict' as const })) })
    const screen = createHitsScreen(hits)
    await screen.load()
    await screen.approve(hitItem().id)
    expect(hits.list).toHaveBeenCalledTimes(2)
    expect(screen.message).toEqual({ tone: 'warning', key: 'hits.conflict' })
    expect(screen.items).toHaveLength(2)
  })

  it('does not reject without a reason, and sends the typed one', async () => {
    const hits = service()
    const screen = createHitsScreen(hits)
    await screen.load()
    await screen.reject(hitItem().id)
    expect(hits.review).not.toHaveBeenCalled()
    expect(screen.reasonMissing).toBe(hitItem().id)
    screen.setReason(hitItem().id, '  Foto sem o produto  ')
    await screen.reject(hitItem().id)
    expect(hits.review).toHaveBeenCalledWith(hitItem().id, { action: 'reject', expectedVersion: 1, reason: 'Foto sem o produto' })
  })

  it('takes an approved item down with a reason, from the approved tab', async () => {
    const hits = service({ list: vi.fn(async () => ok({ items: [hitItem({ status: 'approved' })], nextCursor: null })) })
    const screen = createHitsScreen(hits)
    await screen.switchTab('approved')
    expect(hits.list).toHaveBeenCalledWith({ status: 'approved' })
    screen.setReason(hitItem().id, 'Preço errado')
    await screen.takeDown(hitItem().id)
    expect(hits.review).toHaveBeenCalledWith(hitItem().id, { action: 'takeDown', reason: 'Preço errado' })
    expect(screen.items).toEqual([])
  })

  it('loads the next page after the cursor and keeps the first one', async () => {
    const list = vi
      .fn<AdminHitsService['list']>()
      .mockResolvedValueOnce(ok({ items: [hitItem()], nextCursor: hitItem().id }))
      .mockResolvedValueOnce(ok({ items: [hitItem({ id: OTHER_ID })], nextCursor: null }))
    const screen = createHitsScreen(service({ list }))
    await screen.load()
    expect(screen.hasMore).toBe(true)
    await screen.loadMore()
    expect(list).toHaveBeenLastCalledWith({ status: 'pending', cursor: hitItem().id })
    expect(screen.items).toHaveLength(2)
    expect(screen.hasMore).toBe(false)
  })
})
