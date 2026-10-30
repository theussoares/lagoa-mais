import type { AdminFeaturedList, AdminPlacement, FeaturedAvailability, FeaturedPlacementDraft, FeaturedRangeQuery } from '#shared/schemas/featured'
import type { ErrorOf, TransportError } from '#shared/types/errors'
import type { Result } from '#shared/types/result'

export type AdminFeaturedReadError = ErrorOf<'forbidden'> | TransportError
/** `slotsFull`: algum instante do período já tem todas as vagas pagas; `invalidTarget`: loja ou produto fora da vitrine. */
export type AdminPlacementCreateError = ErrorOf<'slotsFull' | 'invalidTarget' | 'forbidden'> | TransportError
export type AdminPlacementCancelError = ErrorOf<'notFound' | 'invalidTransition' | 'forbidden'> | TransportError

/** Destaques pagos: agenda de vagas, lançar e cancelar. */
export interface AdminFeaturedService {
  list(range: FeaturedRangeQuery): Promise<Result<AdminFeaturedList, AdminFeaturedReadError>>
  availability(range: FeaturedRangeQuery): Promise<Result<FeaturedAvailability, AdminFeaturedReadError>>
  create(draft: FeaturedPlacementDraft): Promise<Result<AdminPlacement, AdminPlacementCreateError>>
  cancel(id: string): Promise<Result<AdminPlacement, AdminPlacementCancelError>>
}
