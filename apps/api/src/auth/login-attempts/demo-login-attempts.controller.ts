import { Controller, Headers, HttpCode, Inject, Post, Req, UnauthorizedException } from '@nestjs/common'
import { ThrottlerException } from '@nestjs/throttler'
import { BFF_SECRET_HEADER, clientIpOf, isBffCaller } from '../../common/http/client-ip'
import { DomainException } from '../../common/http/domain-exception'
import { ENV } from '../../config/config.module'
import type { Env } from '../../config/env'
import { FailClosedThrottle } from '../../throttling/fail-closed-throttle'
import { Public } from '../public.decorator'
import { LoginAttemptGate } from './login-attempt-gate'

/**
 * Chamado só pelo BFF, antes de entrar pela conta de demonstração. O teto é por IP do cliente (`x-client-ip`, que a API
 * só aceita com o segredo do BFF), não por celular: o número demo é público e um teto por ele travaria a demo para todos.
 * 204 = pode entrar; 429 = este IP passou do teto; 503 = o contador caiu (ninguém entra sem ser contado).
 */
@Controller('auth/demo-login-attempts')
export class DemoLoginAttemptsController {
  constructor(
    @Inject(ENV) private readonly env: Pick<Env, 'BFF_SHARED_SECRET'>,
    private readonly gate: LoginAttemptGate,
  ) {}

  @Public()
  @FailClosedThrottle()
  @Post()
  @HttpCode(204)
  async reserve(@Headers(BFF_SECRET_HEADER) presentedSecret: string | undefined, @Req() request: { readonly ip?: string }): Promise<void> {
    if (!isBffCaller(this.env.BFF_SHARED_SECRET, presentedSecret)) throw new UnauthorizedException()
    const verdict = await this.gate.reserveDemoLogin(clientIpOf(request))
    if (verdict === 'refused') throw new ThrottlerException()
    if (verdict === 'unavailable') throw new DomainException({ code: 'network' })
  }
}
