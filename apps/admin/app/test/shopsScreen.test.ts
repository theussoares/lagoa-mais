import { describe, expect, it, vi } from 'vitest'
import { ok } from '#shared/types/result'
import { createShopDetailScreen, createShopsScreen } from '../screens/shopsScreen'
import type { AdminShopsService } from '../services/AdminShopsService'
import { SHOP_ID, shopDetail, shopRow } from './fixtures'

function service(patch: Partial<AdminShopsService> = {}): AdminShopsService {
  return {
    list: vi.fn(async () => ok({ shops: [shopRow()], nextCursor: null })),
    detail: vi.fn(async () => ok(shopDetail())),
    act: vi.fn(async () => ok(shopDetail({ status: 'approved' }))),
    ...patch,
  }
}

describe('shops screen', () => {
  it('searches by name from the first page, with the status filter', async () => {
    const shops = service()
    const screen = createShopsScreen(shops)
    await screen.load()
    screen.setStatus('pending')
    screen.setQuery('  padaria ')
    await screen.search()
    expect(shops.list).toHaveBeenLastCalledWith({ status: 'pending', q: 'padaria' })
  })
})

describe('shop detail screen', () => {
  it('approves and shows the new state', async () => {
    const shops = service()
    const screen = createShopDetailScreen(shops, SHOP_ID)
    await screen.load()
    await screen.act({ action: 'approve' })
    expect(shops.act).toHaveBeenCalledWith(SHOP_ID, { action: 'approve' })
    expect(screen.shop?.status).toBe('approved')
  })

  it('does not suspend without a reason', async () => {
    const shops = service()
    const screen = createShopDetailScreen(shops, SHOP_ID)
    await screen.load()
    await screen.suspend()
    expect(shops.act).not.toHaveBeenCalled()
    expect(screen.reasonMissing).toBe(true)
    screen.setReason('Sem pagamento')
    await screen.suspend()
    expect(shops.act).toHaveBeenCalledWith(SHOP_ID, { action: 'suspend', reason: 'Sem pagamento' })
  })
})
