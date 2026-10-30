import type { PhoneNumber } from '#shared/schemas/phone'
import type { LoginCode } from '#shared/schemas/session'
import type { DomainError, TransportError } from '#shared/types/errors'
import { err, ok, type Result } from '#shared/types/result'
import { parseDomainError, isTransportError } from '../utils/domainError'
import { z } from 'zod'
import type { DemoSurface } from '../types/signIn'
import type { SignInError } from './AuthService'
import type { PhoneAuthGateway } from './PhoneAuthGateway'
import { BFF_AUTH_BASE } from './http/bffPaths'

const DemoAvailabilitySchema = z.object({ customer: z.boolean(), merchant: z.boolean() })

/** Login pelo BFF do Nuxt: o servidor fala com o Supabase e guarda o token em cookie httpOnly. */
export class BffPhoneAuthGateway implements PhoneAuthGateway {
  constructor(private readonly fetcher: typeof fetch) {}

  async sendCode(phone: PhoneNumber): Promise<Result<true, TransportError>> {
    const failure = await this.post('otp', { phone })
    if (failure === null) return ok(true)
    return err(isTransportError(failure) ? failure : { code: 'internal' })
  }

  async verifyCode(phone: PhoneNumber, code: LoginCode): Promise<Result<true, SignInError>> {
    const failure = await this.post('verify', { phone, code })
    if (failure === null) return ok(true)
    if (isTransportError(failure)) return err(failure)
    return err({ code: failure.code === 'loginCodeExpired' ? 'loginCodeExpired' : 'invalidLoginCode' })
  }

  async demoAvailable(surface: DemoSurface): Promise<boolean> {
    try {
      const response = await this.fetcher(`${BFF_AUTH_BASE}/demo`)
      if (!response.ok) return false
      const body: unknown = await response.json().catch(() => null)
      return DemoAvailabilitySchema.safeParse(body).data?.[surface] === true
    } catch {
      return false
    }
  }

  async demoSignIn(surface: DemoSurface): Promise<Result<true, SignInError>> {
    const failure = await this.post('demo', { surface })
    if (failure === null) return ok(true)
    if (isTransportError(failure)) return err(failure)
    return err({ code: failure.code === 'loginCodeExpired' ? 'loginCodeExpired' : 'invalidLoginCode' })
  }

  async signOut(): Promise<Result<true, TransportError>> {
    const failure = await this.post('signout', {})
    if (failure === null) return ok(true)
    return err(isTransportError(failure) ? failure : { code: 'internal' })
  }

  /** `null` = deu certo; senão o erro traduzido do corpo `{ code }`. */
  private async post(step: 'otp' | 'verify' | 'demo' | 'signout', body: unknown): Promise<DomainError | null> {
    try {
      const response = await this.fetcher(`${BFF_AUTH_BASE}/${step}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      })
      return response.ok ? null : parseDomainError(await response.json().catch(() => null))
    } catch {
      return { code: 'network' }
    }
  }
}
