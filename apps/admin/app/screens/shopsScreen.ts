import { reactive } from 'vue'
import type { AdminShopAction, AdminShopDetail, AdminShopListQuery, AdminShopRow } from '#shared/schemas/admin'
import type { AdminShopError, AdminShopsService } from '../services/AdminShopsService'
import type { ShopDetailScreen, ShopStatusFilter, ShopsScreen } from '../types/admin'

/** Lojas da rede: a API já põe as pendentes primeiro; o filtro e a busca recomeçam da primeira página. */
export function createShopsScreen(service: AdminShopsService): ShopsScreen {
  let nextCursor: string | null = null

  const queryOf = (cursor?: string): AdminShopListQuery => {
    const q = screen.query.trim()
    return {
      ...(screen.status === 'all' ? {} : { status: screen.status }),
      ...(q === '' ? {} : { q }),
      ...(cursor === undefined ? {} : { cursor }),
    }
  }

  async function fetchPage(cursor?: string): Promise<void> {
    screen.loading = true
    const result = await service.list(queryOf(cursor))
    screen.loading = false
    if (!result.ok) {
      screen.loadError = result.error.code
      return
    }
    screen.loadError = null
    screen.shops = cursor === undefined ? result.value.shops : [...screen.shops, ...result.value.shops]
    nextCursor = result.value.nextCursor
    screen.hasMore = nextCursor !== null
  }

  const screen: ShopsScreen = reactive({
    shops: [] as AdminShopRow[],
    status: 'all' as ShopStatusFilter,
    query: '',
    loading: false,
    loadError: null,
    hasMore: false,
    load: () => fetchPage(),
    search: () => fetchPage(),
    async loadMore(): Promise<void> {
      if (nextCursor !== null) await fetchPage(nextCursor)
    },
    setStatus(status: ShopStatusFilter): void {
      screen.status = status
    },
    setQuery(query: string): void {
      screen.query = query
    },
  })
  return screen
}

const ACTION_DONE: Readonly<Record<AdminShopAction['action'], string>> = {
  approve: 'shopDetail.done.approve',
  suspend: 'shopDetail.done.suspend',
  reactivate: 'shopDetail.done.reactivate',
  changePlan: 'shopDetail.done.changePlan',
}

const actionErrorKey = (error: AdminShopError): string => (error.code === 'invalidTransition' ? 'shopDetail.errors.invalidTransition' : `errors.${error.code}`)

/** Detalhe de uma loja: dados, programa, plano, histórico e as ações. Suspender exige o motivo. */
export function createShopDetailScreen(service: AdminShopsService, shopId: string): ShopDetailScreen {
  async function run(action: AdminShopAction): Promise<void> {
    screen.busy = true
    const result = await service.act(shopId, action)
    screen.busy = false
    if (!result.ok) {
      screen.message = { tone: 'error', key: actionErrorKey(result.error) }
      return
    }
    screen.shop = result.value
    screen.reason = ''
    screen.message = { tone: 'success', key: ACTION_DONE[action.action] }
  }

  const screen: ShopDetailScreen = reactive({
    shop: null as AdminShopDetail | null,
    loading: false,
    loadError: null,
    busy: false,
    message: null,
    reason: '',
    reasonMissing: false,
    async load(): Promise<void> {
      screen.loading = true
      const result = await service.detail(shopId)
      screen.loading = false
      if (result.ok) screen.shop = result.value
      else screen.loadError = result.error.code
    },
    setReason(reason: string): void {
      screen.reason = reason
      screen.reasonMissing = false
    },
    act: (action: Exclude<AdminShopAction, { action: 'suspend' }>) => run(action),
    async suspend(): Promise<void> {
      const reason = screen.reason.trim()
      if (reason === '') {
        screen.reasonMissing = true
        return
      }
      await run({ action: 'suspend', reason })
    },
  })
  return screen
}
