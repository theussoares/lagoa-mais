import type { AdminAuthErrorCode, ProviderError } from '../types/auth'

const STATUS_BY_CODE: Readonly<Record<AdminAuthErrorCode, number>> = {
  invalidCredentials: 400,
  captchaFailed: 400,
  invalidMfaCode: 400,
  weakPassword: 400,
  linkExpired: 400,
  unauthorized: 401,
  forbidden: 403,
  rateLimited: 429,
  internal: 500,
  network: 502,
}

const REFUSED_STATUSES: readonly number[] = [400, 401, 403, 422]

const isRateLimited = (error: ProviderError): boolean => error.status === 429 || (error.code ?? '').includes('rate_limit')
/** Sem `status` HTTP = o pedido nem chegou ao provedor. */
const isOffline = (error: ProviderError): boolean => error.status === undefined || error.status === 0
const isRefused = (error: ProviderError): boolean => error.status !== undefined && REFUSED_STATUSES.includes(error.status)

function transportCodeOf(error: ProviderError): AdminAuthErrorCode {
  if (isRateLimited(error)) return 'rateLimited'
  return isOffline(error) ? 'network' : 'internal'
}

/** Senha errada, e-mail sem conta ou sem confirmar: tudo a mesma resposta, para não contar quem existe. */
export const signInErrorCodeOf = (error: ProviderError): AdminAuthErrorCode =>
  !isRateLimited(error) && isRefused(error) ? 'invalidCredentials' : transportCodeOf(error)

export const verifyErrorCodeOf = (error: ProviderError): AdminAuthErrorCode =>
  !isRateLimited(error) && isRefused(error) ? 'invalidMfaCode' : transportCodeOf(error)

const WEAK_PASSWORD_CODES: readonly string[] = ['weak_password', 'same_password']

export function passwordErrorCodeOf(error: ProviderError): AdminAuthErrorCode {
  if (WEAK_PASSWORD_CODES.includes(error.code ?? '')) return 'weakPassword'
  if (error.code === 'insufficient_aal') return 'forbidden'
  return !isRateLimited(error) && isRefused(error) ? 'unauthorized' : transportCodeOf(error)
}

/** Só a recusa explícita do refresh token derruba a sessão; 5xx, limite ou rede do provedor não. */
export const refreshErrorCodeOf = (error: ProviderError): AdminAuthErrorCode =>
  !isRateLimited(error) && isRefused(error) ? 'unauthorized' : transportCodeOf(error)

export const adminAuthErrorStatus = (code: AdminAuthErrorCode): number => STATUS_BY_CODE[code]
