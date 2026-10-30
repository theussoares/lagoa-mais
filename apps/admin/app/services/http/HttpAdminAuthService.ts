import { z } from 'zod'
import { AdminMfaEnrollmentSchema, AdminMfaNextSchema, AdminSessionSchema } from '#shared/schemas/admin'
import type { AdminAuthErrorCode } from '#shared/types/adminAuth'
import { err, ok, type Result } from '#shared/types/result'
import type { AdminAuthError, AdminAuthService } from '../AdminAuthService'

const AUTH_ERROR_CODES: readonly AdminAuthErrorCode[] = [
  'invalidCredentials', 'captchaFailed', 'invalidMfaCode', 'mfaCodeRequired', 'weakPassword', 'linkExpired', 'rateLimited', 'unauthorized', 'forbidden', 'network', 'internal',
]
const ErrorBodySchema = z.object({ code: z.string() })
const OkSchema = z.object({ ok: z.literal(true) })
const NextSchema = z.object({ next: AdminMfaNextSchema })

const codeOf = (body: unknown): AdminAuthErrorCode => {
  const parsed = ErrorBodySchema.safeParse(body)
  const code = parsed.success ? parsed.data.code : 'internal'
  return AUTH_ERROR_CODES.find((known) => known === code) ?? 'internal'
}

/** Login do painel pelo BFF do admin. Os códigos de erro são os do BFF (`invalidCredentials`, `captchaFailed`…). */
export class HttpAdminAuthService implements AdminAuthService {
  constructor(private readonly fetcher: typeof fetch) {}

  async session() {
    const result = await this.send('GET', '/api/auth/session', z.unknown())
    if (!result.ok) return result
    // Sem sessão o BFF responde 204 (corpo vazio).
    const session = AdminSessionSchema.safeParse(result.value ?? null)
    return session.success ? ok(session.data) : err({ code: 'internal' as const })
  }

  async signIn(input: Parameters<AdminAuthService['signIn']>[0]) {
    const result = await this.send('POST', '/api/auth/login', NextSchema, input)
    return result.ok ? ok(result.value.next) : result
  }

  enrollMfa = (currentCode?: string) => this.send('POST', '/api/auth/mfa-enroll', AdminMfaEnrollmentSchema, currentCode === undefined ? {} : { currentCode })
  verifyMfa = (code: string) => this.done(this.send('POST', '/api/auth/mfa-verify', OkSchema, { code }))
  requestPasswordReset = (input: Parameters<AdminAuthService['requestPasswordReset']>[0]) => this.done(this.send('POST', '/api/auth/forgot-password', OkSchema, input))
  setPassword = (input: Parameters<AdminAuthService['setPassword']>[0]) => this.done(this.send('POST', '/api/auth/set-password', OkSchema, input))
  changePassword = (password: string, currentCode: string) => this.done(this.send('POST', '/api/account/password', OkSchema, { password, currentCode }))
  signOut = () => this.done(this.send('POST', '/api/auth/logout', OkSchema))

  private async done(pending: Promise<Result<unknown, AdminAuthError>>): Promise<Result<true, AdminAuthError>> {
    const result = await pending
    return result.ok ? ok(true) : result
  }

  private async send<S extends z.ZodType>(method: 'GET' | 'POST', path: string, schema: S, body?: unknown): Promise<Result<z.infer<S>, AdminAuthError>> {
    const response = await this.fetcher(path, {
      method,
      ...(body === undefined ? {} : { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }),
    }).catch(() => null)
    if (response === null) return err({ code: 'network' })
    const payload: unknown = response.status === 204 ? undefined : await response.json().catch(() => undefined)
    if (!response.ok) return err({ code: codeOf(payload) })
    const parsed = schema.safeParse(payload)
    return parsed.success ? ok(parsed.data) : err({ code: 'internal' })
  }
}
