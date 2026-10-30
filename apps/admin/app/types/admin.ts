import type { AdminHitItem, AdminHitItemTab, AdminShopAction, AdminShopDetail, AdminShopRow, AdminUser } from '#shared/schemas/admin'
import type { AdminFeaturedList, FeaturedAvailability, FeaturedSurface } from '#shared/schemas/featured'
import type { DomainErrorCode } from '#shared/types/errors'
import type { ShopStatus } from '#shared/schemas/shop'
import type { AdminHitsService } from '../services/AdminHitsService'
import type { AdminShopsService } from '../services/AdminShopsService'
import type { AdminFeaturedService } from '../services/AdminFeaturedService'
import type { AdminTeamAction } from '../services/AdminTeamService'

/** Aviso do topo da tela: chave i18n completa e o tom do `InkNote`. */
export interface ScreenMessage {
  readonly tone: 'success' | 'warning' | 'error'
  readonly key: string
}

export interface HitsScreen {
  tab: AdminHitItemTab
  items: AdminHitItem[]
  loading: boolean
  loadError: DomainErrorCode | null
  hasMore: boolean
  message: ScreenMessage | null
  busyId: string | null
  reasons: Record<string, string>
  reasonMissing: string | null
  load(): Promise<void>
  loadMore(): Promise<void>
  switchTab(tab: AdminHitItemTab): Promise<void>
  setReason(id: string, reason: string): void
  approve(id: string): Promise<void>
  reject(id: string): Promise<void>
  takeDown(id: string): Promise<void>
}

export type ShopStatusFilter = ShopStatus | 'all'

export interface ShopsScreen {
  shops: AdminShopRow[]
  status: ShopStatusFilter
  query: string
  loading: boolean
  loadError: DomainErrorCode | null
  hasMore: boolean
  load(): Promise<void>
  loadMore(): Promise<void>
  search(): Promise<void>
  setStatus(status: ShopStatusFilter): void
  setQuery(query: string): void
}

export interface ShopDetailScreen {
  shop: AdminShopDetail | null
  loading: boolean
  loadError: DomainErrorCode | null
  busy: boolean
  message: ScreenMessage | null
  reason: string
  reasonMissing: boolean
  load(): Promise<void>
  setReason(reason: string): void
  act(action: Exclude<AdminShopAction, { action: 'suspend' }>): Promise<void>
  suspend(): Promise<void>
}

/** O que a tela de Destaques lê do Hits e das Lojas: só listar (aprovados). */
export interface FeaturedScreenDeps {
  readonly featured: AdminFeaturedService
  readonly shops: Pick<AdminShopsService, 'list'>
  readonly hits: Pick<AdminHitsService, 'list'>
  readonly now: () => Date
}

export interface FeaturedForm {
  shopId: string
  hitItemId: string
  /** Dias locais `AAAA-MM-DD`, o último incluído. */
  startDate: string
  endDate: string
  note: string
}

export interface FeaturedOption {
  readonly value: string
  readonly label: string
}

export interface FeaturedScreen {
  surface: FeaturedSurface
  form: FeaturedForm
  placements: AdminFeaturedList['placements']
  proShops: AdminFeaturedList['proShops']
  days: FeaturedAvailability['days']
  shopOptions: FeaturedOption[]
  itemOptions: FeaturedOption[]
  fullDays: string[]
  canLaunch: boolean
  loading: boolean
  loadError: DomainErrorCode | null
  saving: boolean
  busyId: string | null
  message: ScreenMessage | null
  load(): Promise<void>
  switchSurface(surface: FeaturedSurface): Promise<void>
  change(patch: Partial<FeaturedForm>): void
  launch(): Promise<void>
  cancel(id: string): Promise<void>
}

export interface TeamInviteForm {
  name: string
  email: string
}

export interface TeamScreen {
  members: AdminUser[]
  loading: boolean
  loadError: DomainErrorCode | null
  form: TeamInviteForm
  inviting: boolean
  busyId: string | null
  /** Ação que espera o segundo clique de confirmação. */
  armed: { id: string; action: AdminTeamAction } | null
  message: ScreenMessage | null
  load(): Promise<void>
  change(patch: Partial<TeamInviteForm>): void
  invite(): Promise<void>
  act(id: string, action: AdminTeamAction): Promise<void>
}
