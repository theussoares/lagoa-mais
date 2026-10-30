import type { H3Event } from 'h3'
import type { AdminAuthOutcome, AssuranceLevel, TotpFactors } from '../types/auth'
import type { AdminLogin } from './adminLogin'
import { createAdminLogin, readAdminConfig } from './adminConfig'
import { endAdminSession, resolveAdminTokens, type StoredTokens } from './adminSession'
import { claimsOf } from './tokenClaims'

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
  const claims = claimsOf(tokens.value.accessToken)
  if (claims === null || !claims.isAdmin) {
    endAdminSession(event, settings)
    return { ok: false, code: 'unauthorized' }
  }
  const auth = createAdminLogin()
  const opened = await auth.use(tokens.value)
  if (!opened.ok) return opened
  const factors = await auth.factors()
  if (!factors.ok) return factors
  return { ok: true, value: { auth, tokens: tokens.value, aal: claims.aal, email: claims.email, factors: factors.value } }
}
