import type { CampaignOverview } from '#shared/schemas/campaign'
import type { HomeOverview, HomePeriod } from '#shared/schemas/homeOverview'
import type { Program } from '#shared/schemas/program'
import type { WeekSummary } from '#shared/schemas/weekSummary'
import type { TransportError } from '#shared/types/errors'
import type { AsyncResultState } from '#layers/core/app/types/asyncResult'
import type { ComputedRef, Ref } from 'vue'
import type { CheckInPosterModel } from './poster'

export type HomeDiffTone = 'success' | 'error' | 'neutral'

export interface HomeIndicatorCardBadge {
  readonly text: string
  readonly label: string
  readonly tone: HomeDiffTone
  readonly icon: string
}

export interface HomeIndicatorCardAction {
  readonly label: string
  readonly to: string
}

export interface HomeIndicatorCardModel {
  readonly id: 'activeCustomers' | 'lapsedCustomers' | 'deliveredRewards' | 'nearReward'
  readonly icon: string
  readonly title: string
  readonly value: string
  readonly subtitle: string | null
  readonly badge?: HomeIndicatorCardBadge
  readonly action?: HomeIndicatorCardAction
}

export interface HomeActivityRowModel {
  readonly id: string
  readonly initials: string
  readonly avatarBg: string
  readonly avatarText: string
  readonly customerName: string
  readonly maskedPhone: string | null
  readonly icon: string
  readonly iconColor: string
  readonly label: string
  readonly sub: string
  readonly relativeTime: string
  readonly to: string
}

export interface HomeActiveCampaignModel {
  readonly id: string
  readonly title: string
  readonly description: string
  readonly status: string
  readonly icon: string
  readonly iconBg: string
  readonly iconColor: string
  readonly badgeBg: string
  readonly badgeColor: string
  readonly to: string
}

export interface HomeComparisonBarModel {
  readonly id: 'newCustomers' | 'visits' | 'purchases' | 'redemptions'
  readonly label: string
  readonly current: number
  readonly previous: number
  readonly currentHeight: number
  readonly previousHeight: number
  readonly diffText: string | null
  readonly diffTone: HomeDiffTone
  readonly diffIcon: string
  readonly currentTitle: string
  readonly previousTitle: string
}

export interface HomeOpportunityModel {
  readonly id: 'lapsed' | 'near-reward' | 'reward-ready'
  readonly title: string
  readonly count: number
  readonly icon: string
  readonly iconColor: string
  readonly badgeClass: string
  readonly to: string
}

export interface MerchantHomeSnapshot {
  readonly week: WeekSummary
  readonly overview: HomeOverview
  /** Programa e prêmio cadastrados da loja. */
  readonly program: Program | null
  /** Campanhas cadastradas. */
  readonly campaignsOverview: CampaignOverview | null
  /** O cartaz antigo ainda está na parede. Sem a resposta, o aviso não aparece. */
  readonly posterReprintPending: boolean
  /** Alertas de serviços que falharam (não-autorizado derruba a tela; outras falhas geram aviso). */
  readonly warnings: readonly ('program' | 'campaigns')[]
}

export interface MerchantHomeViewModel {
  readonly cards: readonly HomeIndicatorCardModel[]
  readonly activityRows: readonly HomeActivityRowModel[]
  readonly activeCampaigns: readonly HomeActiveCampaignModel[]
  readonly campaignsSeeAllTo: string
  readonly comparisonBars: Record<HomePeriod, readonly HomeComparisonBarModel[]>
  readonly opportunities: readonly HomeOpportunityModel[]
  readonly posterReprintPending: boolean
  readonly warnings: readonly ('program' | 'campaigns')[]
}

export interface PosterReprint {
  /** Cartaz novo, só montado durante a impressão. */
  readonly poster: CheckInPosterModel | null
  readonly printing: boolean
  print: () => Promise<void>
}

export interface MerchantHome {
  state: ComputedRef<AsyncResultState<MerchantHomeSnapshot, TransportError>>
  refreshedAt: Readonly<Ref<Date>>
  reload: () => Promise<void>
  posterReprint: PosterReprint
}
