import { Inject, Injectable, Logger } from '@nestjs/common'
import type { ThrottlerStorage } from '@nestjs/throttler'
import { ADMIN_LOGIN_ATTEMPTS_MAX, ADMIN_LOGIN_WINDOW_MINUTES, DEMO_LOGIN_ATTEMPTS_MAX, DEMO_LOGIN_WINDOW_MINUTES, LOGIN_VERIFY_ATTEMPTS_MAX, LOGIN_VERIFY_WINDOW_MINUTES } from '#shared/constants/domain'
import type { PhoneNumber } from '#shared/schemas/phone'
import { PiiService } from '../../common/pii.service'

/** Contador compartilhado (o mesmo `rate_limits` do limite de uso, ADR-0002). */
export const LOGIN_ATTEMPT_COUNTER = Symbol('LOGIN_ATTEMPT_COUNTER')

const WINDOW_MS = LOGIN_VERIFY_WINDOW_MINUTES * 60_000
const ADMIN_WINDOW_MS = ADMIN_LOGIN_WINDOW_MINUTES * 60_000

/** `refused` = passou do teto; `unavailable` = o contador não respondeu (também recusa, mas a resposta é outra). */
export type AttemptVerdict = 'allowed' | 'refused' | 'unavailable'

/** A chave leva o hash do celular (HMAC com pepper), nunca o número. */
export const loginAttemptKey = (phoneHash: Buffer): string => `login-verify:${phoneHash.toString('hex')}`

/** Login por senha do painel da rede: hash do e-mail normalizado, nunca o e-mail. Prefixo próprio, contador próprio. */
export const adminLoginAttemptKey = (emailHash: Buffer): string => `admin-login:${emailHash.toString('hex')}`

/** Login da conta de demonstração: chave por IP do cliente (hash), prefixo próprio, nunca o contador do celular. */
export const demoLoginAttemptKey = (ipHash: Buffer): string => `demo-login:${ipHash.toString('hex')}`

interface Cap {
  readonly key: string
  readonly windowMs: number
  readonly limit: number
  readonly throttlerName: string
}

/** Decide se este celular (ou e-mail de admin) ainda pode tentar entrar agora. Cada pergunta já conta uma tentativa. */
@Injectable()
export class LoginAttemptGate {
  private readonly logger = new Logger('LoginAttempts')

  constructor(
    @Inject(LOGIN_ATTEMPT_COUNTER) private readonly counter: ThrottlerStorage,
    private readonly pii: PiiService,
  ) {}

  async allow(phone: PhoneNumber): Promise<boolean> {
    const key = loginAttemptKey(this.pii.hashPhone(phone))
    return (await this.reserve({ key, windowMs: WINDOW_MS, limit: LOGIN_VERIFY_ATTEMPTS_MAX, throttlerName: 'loginVerify' })) === 'allowed'
  }

  /** Cada IP tem o seu teto: um visitante insistente não trava a demonstração para os outros. */
  async reserveDemoLogin(clientIp: string): Promise<AttemptVerdict> {
    const key = demoLoginAttemptKey(this.pii.hashClientIp(clientIp))
    return this.reserve({ key, windowMs: DEMO_LOGIN_WINDOW_MINUTES * 60_000, limit: DEMO_LOGIN_ATTEMPTS_MAX, throttlerName: 'demoLogin' })
  }

  /** Não consulta se o e-mail é de alguém: a resposta é a mesma para e-mail de admin e para qualquer outro. */
  async reserveAdminLogin(email: string): Promise<AttemptVerdict> {
    const key = adminLoginAttemptKey(this.pii.hashEmail(email))
    return this.reserve({ key, windowMs: ADMIN_WINDOW_MS, limit: ADMIN_LOGIN_ATTEMPTS_MAX, throttlerName: 'adminLogin' })
  }

  private async reserve(cap: Cap): Promise<AttemptVerdict> {
    try {
      const record = await this.counter.increment(cap.key, cap.windowMs, cap.limit, 0, cap.throttlerName)
      return record.isBlocked ? 'refused' : 'allowed'
    } catch {
      // Sem contador não há teto, e o teto é o que segura a adivinhação: recusa (fail-closed).
      this.logger.warn('Counter unavailable, refusing the login attempt')
      return 'unavailable'
    }
  }
}
