import type { AdminMfaEnrollment, AdminMfaNext, AdminPasswordResetRequest, AdminSession, AdminSetPassword, AdminSignIn } from '#shared/schemas/admin'
import type { Result } from '#shared/types/result'
import type { AdminAuthErrorCode } from '#shared/types/adminAuth'

export interface AdminAuthError {
  readonly code: AdminAuthErrorCode
}

/** Entrar, autenticador, senha e sessão do painel, tudo pelo BFF (`/api/auth`, `/api/account`). */
export interface AdminAuthService {
  session(): Promise<Result<AdminSession, AdminAuthError>>
  signIn(input: AdminSignIn): Promise<Result<AdminMfaNext, AdminAuthError>>
  /** `currentCode`: o código do autenticador atual, para trocar de aparelho em Minha conta. */
  enrollMfa(currentCode?: string): Promise<Result<AdminMfaEnrollment, AdminAuthError>>
  verifyMfa(code: string): Promise<Result<true, AdminAuthError>>
  requestPasswordReset(input: AdminPasswordResetRequest): Promise<Result<true, AdminAuthError>>
  setPassword(input: AdminSetPassword): Promise<Result<true, AdminAuthError>>
  changePassword(password: string, currentCode: string): Promise<Result<true, AdminAuthError>>
  signOut(): Promise<Result<true, AdminAuthError>>
}
