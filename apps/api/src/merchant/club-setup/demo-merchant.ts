import { Inject, Injectable, Logger, type OnModuleInit } from '@nestjs/common'
import { ENV } from '../../config/config.module'
import type { Env } from '../../config/env'
import { PiiService } from '../../common/pii.service'
import { demoMarkingBootNotice, isDemoOwner } from './club-setup.rules'

/**
 * Reconhece o lojista demo pelo hash do celular. O hash sai do mesmo `PiiService.hashPhone` do cadastro, então é byte a
 * byte o `app_users.phone_hash` do dono demo. Calculado uma vez no boot (singleton); o celular em claro não é guardado
 * nem o `env` inteiro, para nenhum `JSON.stringify`/log da instância o carregar. Mora aqui porque só o Criar o clube usa;
 * se outra superfície precisar, sobe para `common/`.
 */
@Injectable()
export class DemoMerchant implements OnModuleInit {
  private readonly logger = new Logger(DemoMerchant.name)
  private readonly phoneHash: Buffer | null
  private readonly nodeEnv: Env['NODE_ENV']

  constructor(@Inject(ENV) env: Pick<Env, 'DEMO_MERCHANT_PHONE' | 'NODE_ENV'>, pii: PiiService) {
    this.phoneHash = env.DEMO_MERCHANT_PHONE === undefined ? null : pii.hashPhone(env.DEMO_MERCHANT_PHONE)
    this.nodeEnv = env.NODE_ENV
  }

  /** Uma linha por instância (singleton), no boot: o operador vê no log do deploy se a marca ficou ligada. */
  onModuleInit(): void {
    const notice = demoMarkingBootNotice(this.phoneHash !== null, this.nodeEnv)
    if (notice.level === 'warn') this.logger.warn(notice.message)
    else this.logger.log(notice.message)
  }

  /** O dono (pelo hash do celular do JWT) é o lojista demo? */
  owns(ownerPhoneHash: Buffer): boolean {
    return isDemoOwner(ownerPhoneHash, this.phoneHash)
  }
}
