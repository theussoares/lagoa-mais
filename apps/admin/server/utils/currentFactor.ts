import { getRequestIP, type H3Event } from 'h3'
import type { AdminAuthOutcome, TokenPair } from '../types/auth'
import { readAdminConfig } from './adminConfig'
import { reserveAdminLoginAttempt } from './loginAttempts'
import type { MfaContext } from './mfaSession'
import { confirmationFactor } from './mfaPlan'

/**
 * Confere o código do autenticador atual (se a conta tem um) antes de uma ação sensível, gastando do teto por e-mail. O
 * e-mail vem da sessão que o Supabase abriu, não do cookie. `null` = a conta não tem autenticador, nada a conferir.
 */
export async function confirmCurrentFactor(event: H3Event, context: MfaContext, code: string | undefined): Promise<AdminAuthOutcome<TokenPair | null>> {
  const factorId = confirmationFactor(context.factors)
  if (factorId === null) return { ok: true, value: null }
  if (code === undefined) return { ok: false, code: 'mfaCodeRequired' }
  if (context.email === undefined) return { ok: false, code: 'internal' }
  const reserved = await reserveAdminLoginAttempt(readAdminConfig(), context.email, getRequestIP(event, { xForwardedFor: true }))
  if (!reserved.ok) return reserved
  return context.auth.verify(factorId, code)
}
