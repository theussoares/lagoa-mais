import { loginAttemptCheck } from '../../../web/server/utils/loginAttempts'
import { buildUpstreamUrl } from '../../../web/server/utils/upstream'
import type { AdminAuthOutcome } from '../types/auth'
import type { AdminBffConfig } from './adminConfig'
import { verifyTurnstile } from './turnstile'

const ADMIN_LOGIN_ATTEMPTS_PATH = '/auth/admin-login-attempts'
const LOGIN_ATTEMPTS_TIMEOUT_MS = 5000

export function adminLoginAttemptOutcome(status: number | null): AdminAuthOutcome<true> {
  if (status === 204) return { ok: true, value: true }
  if (status === 429) return { ok: false, code: 'rateLimited' }
  return { ok: false, code: status === null ? 'network' : 'internal' }
}

/** Reserva uma tentativa para este e-mail na API. Sem o segredo do BFF: recusa em produção, passa em desenvolvimento. */
export async function reserveAdminLoginAttempt(config: AdminBffConfig, email: string, clientIp: string | undefined): Promise<AdminAuthOutcome<true>> {
  const check = loginAttemptCheck(config.bffSharedSecret, config.production)
  if (check === 'skip') return { ok: true, value: true }
  if (check === 'refuse') return { ok: false, code: 'internal' }
  const response = await fetch(buildUpstreamUrl({ baseUrl: config.apiBaseUrl, path: ADMIN_LOGIN_ATTEMPTS_PATH, search: '' }), {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-bff-secret': config.bffSharedSecret, ...(clientIp === undefined ? {} : { 'x-client-ip': clientIp }) },
    body: JSON.stringify({ email }),
    signal: AbortSignal.timeout(LOGIN_ATTEMPTS_TIMEOUT_MS),
  }).catch(() => null)
  return adminLoginAttemptOutcome(response?.status ?? null)
}

export type CaptchaCheck = 'verify' | 'skip' | 'refuse'

/** Mesmo raciocínio do segredo do BFF: em produção, sem a chave do Turnstile ninguém entra (configuração quebrada). */
export function captchaCheck(turnstileSecret: string, production: boolean): CaptchaCheck {
  if (turnstileSecret !== '') return 'verify'
  return production ? 'refuse' : 'skip'
}

export async function passesCaptcha(config: AdminBffConfig, token: string, clientIp: string | undefined): Promise<boolean> {
  const check = captchaCheck(config.turnstileSecret, config.production)
  if (check === 'skip') return true
  return check === 'verify' && verifyTurnstile(token, config.turnstileSecret, clientIp)
}
