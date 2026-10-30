import { deleteCookie, getCookie, setCookie, type H3Event } from 'h3'
import type { AdminAuthOutcome, CookieSettings, TokenPair } from '../types/auth'
import { ADMIN_ACCESS_COOKIE, ADMIN_REFRESH_COOKIE, adminSessionCookiesFor, expiredAdminCookiesFor } from './adminCookies'
import { createAdminLogin } from './adminConfig'

export type StoredTokens = Pick<TokenPair, 'accessToken' | 'refreshToken'>

export function startAdminSession(event: H3Event, tokens: TokenPair, settings: CookieSettings): void {
  for (const cookie of adminSessionCookiesFor(tokens, settings)) setCookie(event, cookie.name, cookie.value, cookie.options)
}

export function endAdminSession(event: H3Event, settings: CookieSettings): void {
  for (const cookie of expiredAdminCookiesFor(settings)) deleteCookie(event, cookie.name, cookie.options)
}

/**
 * Tokens do pedido: os dos cookies, ou um par novo pelo refresh token quando o de acesso venceu. `unauthorized` = sem
 * sessão ou refresh recusado (os cookies são limpos); rede ou limite do provedor vêm como são.
 */
export async function resolveAdminTokens(event: H3Event, settings: CookieSettings): Promise<AdminAuthOutcome<StoredTokens>> {
  const accessToken = getCookie(event, ADMIN_ACCESS_COOKIE)
  const refreshToken = getCookie(event, ADMIN_REFRESH_COOKIE)
  if (refreshToken === undefined) return { ok: false, code: 'unauthorized' }
  if (accessToken !== undefined) return { ok: true, value: { accessToken, refreshToken } }
  const refreshed = await createAdminLogin().refresh(refreshToken)
  if (refreshed.ok) {
    startAdminSession(event, refreshed.value, settings)
    return { ok: true, value: refreshed.value }
  }
  if (refreshed.code === 'unauthorized') endAdminSession(event, settings)
  return refreshed
}
