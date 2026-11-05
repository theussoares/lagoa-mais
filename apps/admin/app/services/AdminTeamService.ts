import type { AdminInvite, AdminUser } from '#shared/schemas/admin'
import type { ErrorOf, TransportError } from '#shared/types/errors'
import type { Result } from '#shared/types/result'

export type AdminTeamReadError = ErrorOf<'forbidden'> | TransportError
export type AdminInviteError = ErrorOf<'alreadyExists' | 'forbidden'> | TransportError
/** `forbidden` também é agir sobre si mesmo: ninguém se desativa nem zera o próprio autenticador. */
export type AdminTeamActionError = ErrorOf<'notFound' | 'invalidTransition' | 'forbidden'> | TransportError

export type AdminTeamAction = 'disable' | 'reactivate' | 'reset-mfa'

/** Equipe da rede: listar, convidar, desativar, reativar e zerar o autenticador de outra pessoa. */
export interface AdminTeamService {
  list(): Promise<Result<AdminUser[], AdminTeamReadError>>
  invite(invite: AdminInvite): Promise<Result<AdminUser, AdminInviteError>>
  act(id: string, action: AdminTeamAction): Promise<Result<AdminUser, AdminTeamActionError>>
}
