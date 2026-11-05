import { reactive } from 'vue'
import type { AdminHitItem, AdminHitItemTab, HitItemReview } from '#shared/schemas/admin'
import type { AdminHitsReviewError, AdminHitsService } from '../services/AdminHitsService'
import type { HitsScreen } from '../types/admin'

const REVIEW_DONE: Readonly<Record<HitItemReview['action'], string>> = {
  approve: 'hits.approved',
  reject: 'hits.rejected',
  takeDown: 'hits.takenDown',
}

function reviewErrorKey(error: AdminHitsReviewError): string {
  if (error.code === 'conflict') return 'hits.conflict'
  if (error.code === 'invalidTransition' || error.code === 'notFound') return 'hits.gone'
  return `errors.${error.code}`
}

/** Fila do Hits: o que espera decisão e o que está na vitrine. Toda decisão leva a versão que o admin viu. */
export function createHitsScreen(service: AdminHitsService): HitsScreen {
  let nextCursor: string | null = null

  const screen: HitsScreen = reactive({
    tab: 'pending' as AdminHitItemTab,
    items: [] as AdminHitItem[],
    loading: false,
    loadError: null,
    hasMore: false,
    message: null,
    busyId: null,
    reasons: {} as Record<string, string>,
    reasonMissing: null,

    async load(): Promise<void> {
      screen.loading = true
      const result = await service.list({ status: screen.tab })
      screen.loading = false
      if (!result.ok) {
        screen.loadError = result.error.code
        return
      }
      screen.loadError = null
      screen.items = result.value.items
      nextCursor = result.value.nextCursor
      screen.hasMore = nextCursor !== null
    },

    async loadMore(): Promise<void> {
      if (nextCursor === null) return
      screen.loading = true
      const result = await service.list({ status: screen.tab, cursor: nextCursor })
      screen.loading = false
      if (!result.ok) {
        screen.message = { tone: 'error', key: `errors.${result.error.code}` }
        return
      }
      screen.items = [...screen.items, ...result.value.items]
      nextCursor = result.value.nextCursor
      screen.hasMore = nextCursor !== null
    },

    async switchTab(tab: AdminHitItemTab): Promise<void> {
      screen.tab = tab
      screen.message = null
      screen.reasonMissing = null
      await screen.load()
    },

    setReason(id: string, reason: string): void {
      screen.reasons[id] = reason
      if (screen.reasonMissing === id) screen.reasonMissing = null
    },

    approve: (id: string) => withItem(id, (item) => ({ action: 'approve', expectedVersion: item.version })),
    reject: (id: string) => withReason(id, (item, reason) => ({ action: 'reject', expectedVersion: item.version, reason })),
    takeDown: (id: string) => withReason(id, (_item, reason) => ({ action: 'takeDown', reason })),
  })

  async function review(item: AdminHitItem, decision: HitItemReview): Promise<void> {
    screen.busyId = item.id
    const result = await service.review(item.id, decision)
    screen.busyId = null
    if (result.ok) {
      screen.items = screen.items.filter((current) => current.id !== item.id)
      screen.message = { tone: 'success', key: REVIEW_DONE[decision.action] }
      return
    }
    screen.message = { tone: result.error.code === 'conflict' ? 'warning' : 'error', key: reviewErrorKey(result.error) }
    if (result.error.code === 'conflict' || result.error.code === 'invalidTransition' || result.error.code === 'notFound') await screen.load()
  }

  async function withItem(id: string, decide: (item: AdminHitItem) => HitItemReview): Promise<void> {
    const item = screen.items.find((current) => current.id === id)
    if (item !== undefined) await review(item, decide(item))
  }

  async function withReason(id: string, decide: (item: AdminHitItem, reason: string) => HitItemReview): Promise<void> {
    const reason = (screen.reasons[id] ?? '').trim()
    if (reason === '') {
      screen.reasonMissing = id
      return
    }
    await withItem(id, (item) => decide(item, reason))
  }

  return screen
}
