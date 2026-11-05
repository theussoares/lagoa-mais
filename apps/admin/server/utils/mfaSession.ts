import type { H3Event } from 'h3'
import type { AdminAuthOutcome, AssuranceLevel, TotpFactors } from '../types/auth'
import type { AdminLogin } from './adminLogin'
import { createAdminLogin, readAdminConfig } from './adminConfig'
import { sessionSecondsLeft } from './sessionLifetime'
import { endAdminSession, resolveAdminTokens, startAdminSession, type StoredTokens } from './adminSession'

export interface MfaContext {
  readonly auth: AdminLogin
  readonly tokens: StoredTokens
  readonly aal: AssuranceLevel
  readonly email: string | undefined
  readonly factors: TotpFactors
}

/** Sessão do admin aberta num cliente do Supabase, com o nível dela e os fatores TOTP. Conta que não é de admin cai fora. */
export async function openMfaContext(event: H3Event): Promise<AdminAuthOutcome<MfaContext>> {
  const settings = { secure: readAdminConfig().production }
  const tokens = await resolveAdminTokens(event, settings)
  if (!tokens.ok) return tokens
  return openContextFor(event, tokens.value, { persist: true })
}

/**
 * Abre um par de tokens qualquer (o do cookie, ou o do link do e-mail em definir a senha). `persist`: o par girado pelo
 * Supabase volta para o cookie do painel; no link do e-mail não há cookie a manter.
 */
export async function openContextFor(event: H3Event, stored: StoredTokens, options: { persist: boolean }): Promise<AdminAuthOutcome<MfaContext>> {
  const settings = { secure: readAdminConfig().production }
  const auth = createAdminLogin()
  const opened = await auth.use(stored)
  if (!opened.ok) {
    if (opened.code === 'unauthorized' && options.persist) endAdminSession(event, settings)
    return opened
  }
  const { claims, tokens: current } = opened.value
  if (!claims.isAdmin || sessionSecondsLeft(claims.signedInAt, new Date()) === 0) {
    if (options.persist) endAdminSession(event, settings)
    return { ok: false, code: 'unauthorized' }
  }
  // O Supabase pode ter girado o par (token vencido): o refresh token antigo não serve mais, então o novo vai para o cookie.
  if (options.persist && current.refreshToken !== stored.refreshToken) startAdminSession(event, current, settings)
  const factors = await auth.factors()
  if (!factors.ok) return factors
  return { ok: true, value: { auth, tokens: current, aal: claims.aal, email: claims.email, factors: factors.value } }
}
