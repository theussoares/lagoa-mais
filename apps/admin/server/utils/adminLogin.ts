import type { SupabaseClient } from '@supabase/supabase-js'
import type { AdminMfaEnrollment } from '#shared/schemas/admin'
import type { AdminAuthOutcome, PasswordSignIn, TokenPair, TotpFactors } from '../types/auth'
import { passwordErrorCodeOf, refreshErrorCodeOf, signInErrorCodeOf, verifyErrorCodeOf } from './authErrors'

interface SessionLike {
  readonly access_token: string
  readonly refresh_token: string
  readonly expires_in: number
  readonly user: { readonly id: string }
}

interface FactorLike {
  readonly id: string
  readonly factor_type: string
  readonly status: string
}

const tokensOf = (session: SessionLike): TokenPair => ({
  accessToken: session.access_token,
  refreshToken: session.refresh_token,
  expiresIn: session.expires_in,
  userId: session.user.id,
})

function totpFactorsOf(factors: readonly FactorLike[] | undefined): TotpFactors {
  const totp = (factors ?? []).filter((factor) => factor.factor_type === 'totp')
  return {
    verified: totp.filter((factor) => factor.status === 'verified').map((factor) => factor.id),
    pending: totp.filter((factor) => factor.status !== 'verified').map((factor) => factor.id),
  }
}

/**
 * Login do admin no Supabase Auth: e-mail e senha, depois o autenticador (TOTP). Só o servidor fala com ele; o navegador
 * nunca vê o token. Uma instância por pedido (o cliente guarda a sessão em memória).
 */
export class AdminLogin {
  constructor(private readonly supabase: SupabaseClient) {}

  async signIn(email: string, password: string): Promise<AdminAuthOutcome<PasswordSignIn>> {
    const { data, error } = await this.supabase.auth.signInWithPassword({ email, password })
    if (error !== null) return { ok: false, code: signInErrorCodeOf(error) }
    if (data.session === null) return { ok: false, code: 'internal' }
    return {
      ok: true,
      value: { tokens: tokensOf(data.session), isAdmin: data.user.app_metadata.role === 'admin', factors: totpFactorsOf(data.user.factors) },
    }
  }

  async refresh(refreshToken: string): Promise<AdminAuthOutcome<TokenPair>> {
    const { data, error } = await this.supabase.auth.refreshSession({ refresh_token: refreshToken })
    if (error !== null) return { ok: false, code: refreshErrorCodeOf(error) }
    return data.session === null ? { ok: false, code: 'internal' } : { ok: true, value: tokensOf(data.session) }
  }

  /** Abre a sessão do pedido neste cliente; sem ela as chamadas de MFA e de senha não sabem de quem é a conta. */
  async use(tokens: Pick<TokenPair, 'accessToken' | 'refreshToken'>): Promise<AdminAuthOutcome<true>> {
    const { error } = await this.supabase.auth.setSession({ access_token: tokens.accessToken, refresh_token: tokens.refreshToken })
    return error === null ? { ok: true, value: true } : { ok: false, code: refreshErrorCodeOf(error) }
  }

  async factors(): Promise<AdminAuthOutcome<TotpFactors>> {
    const { data, error } = await this.supabase.auth.mfa.listFactors()
    return error === null ? { ok: true, value: totpFactorsOf(data.all) } : { ok: false, code: refreshErrorCodeOf(error) }
  }

  /** Um cadastro pela metade de antes (a pessoa fechou a aba) é descartado: fica só o novo. */
  async enroll(pending: readonly string[]): Promise<AdminAuthOutcome<AdminMfaEnrollment>> {
    for (const factorId of pending) await this.supabase.auth.mfa.unenroll({ factorId })
    const { data, error } = await this.supabase.auth.mfa.enroll({ factorType: 'totp' })
    if (error !== null) return { ok: false, code: refreshErrorCodeOf(error) }
    return { ok: true, value: { qrSvg: data.totp.qr_code, secret: data.totp.secret } }
  }

  /** Confirma o código e devolve a sessão nova, já `aal2`. */
  async verify(factorId: string, code: string): Promise<AdminAuthOutcome<TokenPair>> {
    const { data, error } = await this.supabase.auth.mfa.challengeAndVerify({ factorId, code })
    if (error !== null) return { ok: false, code: verifyErrorCodeOf(error) }
    return { ok: true, value: tokensOf(data) }
  }

  async unenroll(factorIds: readonly string[]): Promise<void> {
    for (const factorId of factorIds) await this.supabase.auth.mfa.unenroll({ factorId })
  }

  async updatePassword(password: string): Promise<AdminAuthOutcome<true>> {
    const { error } = await this.supabase.auth.updateUser({ password })
    return error === null ? { ok: true, value: true } : { ok: false, code: passwordErrorCodeOf(error) }
  }

  async sendPasswordReset(email: string, redirectTo: string): Promise<void> {
    await this.supabase.auth.resetPasswordForEmail(email, { redirectTo })
  }

  /** Revoga só esta sessão no provedor (`local`). Falhar aqui não impede de limpar os cookies. */
  async signOut(tokens: Pick<TokenPair, 'accessToken' | 'refreshToken'>): Promise<void> {
    const opened = await this.use(tokens)
    if (opened.ok) await this.supabase.auth.signOut({ scope: 'local' })
  }
}
