import type { AdminShopAction, AdminShopDetail, AdminShopList, AdminShopListQuery } from '#shared/schemas/admin'
import type { ErrorOf, TransportError } from '#shared/types/errors'
import type { Result } from '#shared/types/result'

export type AdminShopsListError = ErrorOf<'forbidden'> | TransportError
export type AdminShopError = ErrorOf<'notFound' | 'invalidTransition' | 'forbidden'> | TransportError

/** Lojas da rede: fila de aprovação, detalhe (com o contato do dono) e as ações de situação e plano. */
export interface AdminShopsService {
  list(query: AdminShopListQuery): Promise<Result<AdminShopList, AdminShopsListError>>
  detail(id: string): Promise<Result<AdminShopDetail, AdminShopError>>
  act(id: string, action: AdminShopAction): Promise<Result<AdminShopDetail, AdminShopError>>
}
