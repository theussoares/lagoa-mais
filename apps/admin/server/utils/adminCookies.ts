import type { CookieSettings, TokenPair } from '../types/auth'

export const ADMIN_ACCESS_COOKIE = 'lagoa_admin_at'
export const ADMIN_REFRESH_COOKIE = 'lagoa_admin_rt'

/** O cookie some um pouco antes do token vencer, para a API nunca receber um token no limite. */
const EXPIRY_MARGIN_SECONDS = 30

export interface AdminCookieOptions {
  readonly httpOnly: true
  readonly secure: boolean
  /** `strict`: nenhum link de outro site chega ao painel já logado. Sem `domain`: o cookie é só deste host. */
  readonly sameSite: 'strict'
  readonly path: '/'
  readonly maxAge: number
}

export interface AdminCookieWrite {
  readonly name: string
  readonly value: string
  readonly options: AdminCookieOptions
}

const options = (settings: CookieSettings, maxAge: number): AdminCookieOptions => ({ httpOnly: true, secure: settings.secure, sameSite: 'strict', path: '/', maxAge })

/** `refreshMaxAge`: o que falta da sessão (contado do login), nunca um prazo novo a cada renovação. */
export function adminSessionCookiesFor(tokens: TokenPair, settings: CookieSettings, refreshMaxAge: number): AdminCookieWrite[] {
  const accessMaxAge = Math.min(Math.max(tokens.expiresIn - EXPIRY_MARGIN_SECONDS, 0), refreshMaxAge)
  return [
    { name: ADMIN_ACCESS_COOKIE, value: tokens.accessToken, options: options(settings, accessMaxAge) },
    { name: ADMIN_REFRESH_COOKIE, value: tokens.refreshToken, options: options(settings, refreshMaxAge) },
  ]
}

export function expiredAdminCookiesFor(settings: CookieSettings): AdminCookieWrite[] {
  return [ADMIN_ACCESS_COOKIE, ADMIN_REFRESH_COOKIE].map((name) => ({ name, value: '', options: options(settings, 0) }))
}
