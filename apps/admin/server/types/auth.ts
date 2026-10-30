import type { AdminAuthErrorCode } from '#shared/types/adminAuth'
import type { TokenClaims } from '../utils/tokenClaims'

export type { AdminAuthErrorCode }

export interface TokenPair {
  readonly accessToken: string
  readonly refreshToken: string
  /** Segundos de vida do access token, como o Supabase devolve. */
  readonly expiresIn: number
  /** `sub` do token: só para o log de segurança, nunca vai para cookie nem resposta. */
  readonly userId: string
}

export type AdminAuthOutcome<T> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly code: AdminAuthErrorCode }

/** O que o Supabase Auth devolve de erro, sem acoplar ao SDK. */
export interface ProviderError {
  readonly status?: number
  readonly code?: string
}

export interface CookieSettings {
  readonly secure: boolean
}

export type AssuranceLevel = 'aal1' | 'aal2'

/** Fatores TOTP da conta: os já confirmados e os que ficaram no meio do cadastro. */
export interface TotpFactors {
  readonly verified: readonly string[]
  readonly pending: readonly string[]
}

/** Próximo passo do login: cadastrar o autenticador, digitar o código, ou nada (sessão completa). */
export type MfaStep = 'enroll' | 'verify' | 'done'

/** Conta que acabou de entrar com e-mail e senha (ainda `aal1`). */
export interface PasswordSignIn {
  readonly tokens: TokenPair
  readonly isAdmin: boolean
  readonly factors: TotpFactors
}

/** Entrada de um evento de segurança do BFF do admin: nunca e-mail, senha, código nem token. */
export interface AdminSecurityEntry {
  readonly event: 'auth.login' | 'auth.logout'
  readonly outcome: 'success' | 'failure'
  readonly code?: string
  readonly userId?: string
}

/** Sessão que o Supabase abriu de fato no cliente do pedido, com as claims do token dela. */
export interface OpenedSession {
  readonly tokens: TokenPair
  readonly claims: TokenClaims
}
