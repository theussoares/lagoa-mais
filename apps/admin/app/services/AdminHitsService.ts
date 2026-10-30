import type { AdminHitItem, AdminHitItemList, AdminHitItemListQuery, HitItemReview } from '#shared/schemas/admin'
import type { ErrorOf, TransportError } from '#shared/types/errors'
import type { Result } from '#shared/types/result'

export type AdminHitsListError = ErrorOf<'forbidden'> | TransportError
/** `conflict`: o lojista mudou o produto depois que a fila foi carregada; nada foi decidido. */
export type AdminHitsReviewError = ErrorOf<'notFound' | 'conflict' | 'invalidTransition' | 'forbidden'> | TransportError

/** Moderação dos produtos do Hits. */
export interface AdminHitsService {
  list(query: AdminHitItemListQuery): Promise<Result<AdminHitItemList, AdminHitsListError>>
  review(id: string, review: HitItemReview): Promise<Result<AdminHitItem, AdminHitsReviewError>>
}
