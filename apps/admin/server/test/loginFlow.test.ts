import { describe, expect, it, vi } from 'vitest'
import type { AdminAuthOutcome, AdminSecurityEntry, PasswordSignIn } from '../types/auth'
import { type LoginDeps, type PasswordResetDeps, login, requestPasswordReset } from '../utils/loginFlow'

const EMAIL = 'ana@rede.test'
const tokens = { accessToken: 'at', refreshToken: 'rt', expiresIn: 3600, userId: 'admin-1' }
const signedIn = (patch: Partial<PasswordSignIn> = {}): AdminAuthOutcome<PasswordSignIn> => ({
  ok: true,
  value: { tokens, isAdmin: true, factors: { verified: [], pending: [] }, ...patch },
})

function deps(patch: Partial<LoginDeps> = {}): LoginDeps & { logs: AdminSecurityEntry[] } {
  const logs: AdminSecurityEntry[] = []
  return {
    logs,
    verifyCaptcha: vi.fn(async () => true),
    reserveAttempt: vi.fn(async () => ({ ok: true as const, value: true as const })),
    signIn: vi.fn(async () => signedIn()),
    signOut: vi.fn(async () => undefined),
    log: (entry) => logs.push(entry),
    ...patch,
  }
}

const input = { email: EMAIL, password: 'senha-certa-123', captchaToken: 'captcha' }

describe('login', () => {
  it('refuses a failed captcha before counting the try or calling Supabase', async () => {
    const d = deps({ verifyCaptcha: vi.fn(async () => false) })
    expect(await login(d, input)).toEqual({ ok: false, code: 'captchaFailed' })
    expect(d.reserveAttempt).not.toHaveBeenCalled()
    expect(d.signIn).not.toHaveBeenCalled()
  })

  it('stops at the per-e-mail ceiling without calling Supabase', async () => {
    const d = deps({ reserveAttempt: vi.fn(async () => ({ ok: false as const, code: 'rateLimited' as const })) })
    expect(await login(d, input)).toEqual({ ok: false, code: 'rateLimited' })
    expect(d.signIn).not.toHaveBeenCalled()
  })

  it('asks a first-time admin to enroll and someone with an authenticator for the code', async () => {
    expect(await login(deps(), input)).toEqual({ ok: true, value: { tokens, next: 'enroll' } })
    const enrolled = deps({ signIn: vi.fn(async () => signedIn({ factors: { verified: ['f1'], pending: [] } })) })
    expect(await login(enrolled, input)).toEqual({ ok: true, value: { tokens, next: 'verify' } })
  })

  it('answers a customer or merchant account with the same generic error and drops its session', async () => {
    const d = deps({ signIn: vi.fn(async () => signedIn({ isAdmin: false })) })
    expect(await login(d, input)).toEqual({ ok: false, code: 'invalidCredentials' })
    expect(d.signOut).toHaveBeenCalledWith(tokens)
  })

  it('passes a wrong password as the generic error', async () => {
    const d = deps({ signIn: vi.fn(async () => ({ ok: false as const, code: 'invalidCredentials' as const })) })
    expect(await login(d, input)).toEqual({ ok: false, code: 'invalidCredentials' })
  })

  it('never writes the e-mail or the password to the security log', async () => {
    const runs = [deps(), deps({ verifyCaptcha: vi.fn(async () => false) }), deps({ signIn: vi.fn(async () => signedIn({ isAdmin: false })) })]
    for (const d of runs) await login(d, input)
    const logged = JSON.stringify(runs.flatMap((d) => d.logs))
    expect(logged).not.toContain(EMAIL)
    expect(logged).not.toContain('senha-certa-123')
    expect(runs.every((d) => d.logs.length === 1)).toBe(true)
  })
})

describe('requestPasswordReset', () => {
  const resetDeps = (patch: Partial<PasswordResetDeps> = {}): PasswordResetDeps => ({
    verifyCaptcha: vi.fn(async () => true),
    reserveAttempt: vi.fn(async () => ({ ok: true as const, value: true as const })),
    sendReset: vi.fn(async () => undefined),
    ...patch,
  })

  it('answers ok whether the e-mail exists or the provider failed (nothing to learn from it)', async () => {
    const d = resetDeps({ sendReset: vi.fn(async () => Promise.reject(new Error('down'))) })
    expect(await requestPasswordReset(d, { email: EMAIL, captchaToken: 'c' })).toEqual({ ok: true, value: true })
    expect(d.sendReset).toHaveBeenCalledWith(EMAIL)
  })

  it('refuses a failed captcha and the per-e-mail ceiling without sending anything', async () => {
    const noCaptcha = resetDeps({ verifyCaptcha: vi.fn(async () => false) })
    expect(await requestPasswordReset(noCaptcha, { email: EMAIL, captchaToken: 'c' })).toEqual({ ok: false, code: 'captchaFailed' })
    const limited = resetDeps({ reserveAttempt: vi.fn(async () => ({ ok: false as const, code: 'rateLimited' as const })) })
    expect(await requestPasswordReset(limited, { email: EMAIL, captchaToken: 'c' })).toEqual({ ok: false, code: 'rateLimited' })
    expect(noCaptcha.sendReset).not.toHaveBeenCalled()
    expect(limited.sendReset).not.toHaveBeenCalled()
  })
})
