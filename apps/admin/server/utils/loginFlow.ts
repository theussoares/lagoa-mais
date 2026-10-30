import type { AdminMfaNext, AdminPasswordResetRequest, AdminSignIn } from '#shared/schemas/admin'
import type { AdminAuthOutcome, AdminSecurityEntry, PasswordSignIn, TokenPair } from '../types/auth'
import { mfaStep } from './mfaPlan'

export interface LoginDeps {
  verifyCaptcha(token: string): Promise<boolean>
  /** Teto por e-mail na API, antes da senha chegar ao Supabase (lá o limite é por IP, e chega o do BFF). */
  reserveAttempt(email: string): Promise<AdminAuthOutcome<true>>
  signIn(email: string, password: string): Promise<AdminAuthOutcome<PasswordSignIn>>
  signOut(tokens: TokenPair): Promise<void>
  log(entry: AdminSecurityEntry): void
}

/**
 * Captcha → teto por e-mail → senha. Conta que não é de admin recebe o mesmo erro de senha errada (não conta quem é
 * admin) e a sessão que o Supabase abriu é derrubada na hora. O resultado é a sessão `aal1` e o passo do MFA.
 */
export async function login(deps: LoginDeps, input: AdminSignIn): Promise<AdminAuthOutcome<{ tokens: TokenPair; next: AdminMfaNext }>> {
  const failed = (code: Exclude<AdminAuthOutcome<never>, { ok: true }>['code'], userId?: string) => {
    deps.log({ event: 'auth.login', outcome: 'failure', code, ...(userId === undefined ? {} : { userId }) })
    return { ok: false as const, code }
  }
  if (!(await deps.verifyCaptcha(input.captchaToken))) return failed('captchaFailed')
  const reserved = await deps.reserveAttempt(input.email)
  if (!reserved.ok) return failed(reserved.code)
  const signedIn = await deps.signIn(input.email, input.password)
  if (!signedIn.ok) return failed(signedIn.code)
  const { tokens, isAdmin, factors } = signedIn.value
  if (!isAdmin) {
    await deps.signOut(tokens)
    return failed('invalidCredentials', tokens.userId)
  }
  deps.log({ event: 'auth.login', outcome: 'success', code: 'passwordOk', userId: tokens.userId })
  return { ok: true, value: { tokens, next: mfaStep('aal1', factors) === 'verify' ? 'verify' : 'enroll' } }
}

export interface PasswordResetDeps {
  verifyCaptcha(token: string): Promise<boolean>
  reserveAttempt(email: string): Promise<AdminAuthOutcome<true>>
  sendReset(email: string): Promise<void>
}

/** "Esqueci a senha": depois do captcha e do teto, a resposta é sempre a mesma, exista o e-mail ou não. */
export async function requestPasswordReset(deps: PasswordResetDeps, input: AdminPasswordResetRequest): Promise<AdminAuthOutcome<true>> {
  if (!(await deps.verifyCaptcha(input.captchaToken))) return { ok: false, code: 'captchaFailed' }
  const reserved = await deps.reserveAttempt(input.email)
  if (!reserved.ok) return reserved
  await deps.sendReset(input.email).catch(() => undefined)
  return { ok: true, value: true }
}
