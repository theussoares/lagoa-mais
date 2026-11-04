import { Inject, Injectable } from '@nestjs/common'
import { ENV } from '../../config/config.module'
import type { Env } from '../../config/env'
import { PiiService } from '../../common/pii.service'
import { isDemoOwner } from './club-setup.rules'

/**
 * Reconhece o lojista demo pelo hash do celular. O hash sai do mesmo `PiiService.hashPhone` do cadastro, então é byte a
 * byte o `app_users.phone_hash` do dono demo. Calculado uma vez no boot (singleton); o celular em claro não é guardado
 * nem o `env` inteiro, para nenhum `JSON.stringify`/log da instância o carregar. Mora aqui porque só o Criar o clube usa;
 * se outra superfície precisar, sobe para `common/`.
 */
@Injectable()
export class DemoMerchant {
  private readonly phoneHash: Buffer | null

  constructor(@Inject(ENV) env: Pick<Env, 'DEMO_MERCHANT_PHONE'>, pii: PiiService) {
    this.phoneHash = env.DEMO_MERCHANT_PHONE === undefined ? null : pii.hashPhone(env.DEMO_MERCHANT_PHONE)
  }

  /** O dono (pelo hash do celular do JWT) é o lojista demo? */
  owns(ownerPhoneHash: Buffer): boolean {
    return isDemoOwner(ownerPhoneHash, this.phoneHash)
  }
}
