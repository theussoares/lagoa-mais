import { timingSafeEqual } from 'node:crypto'
import { CHECK_IN_CODE_LENGTH } from '#shared/constants/domain'
import { earnRateOf, unitOf } from '#shared/domain/programStrategies'
import type { ClubSetupDraft } from '#shared/schemas/onboarding'
import { CheckInCodeSchema, type CheckInCode } from '#shared/schemas/shop'
import { generateReadableCode } from '../../common/readable-code'

export function newCheckInCode(): CheckInCode {
  return CheckInCodeSchema.parse(generateReadableCode(CHECK_IN_CODE_LENGTH))
}

/** A linha do programa sai de uma função só (a do `PUT /program`): criar o clube e trocar as regras não divergem. */
export { mapDraftToProgramInsert } from '../program/program.rules'

/**
 * RN-01/RN-02: o dono é o lojista demo se o HMAC do celular do JWT é o do `DEMO_MERCHANT_PHONE`. Sem número demo
 * configurado, ninguém é demo. Tempo constante (`timingSafeEqual`), nunca `===`/`equals`; o early return por tamanho
 * não vaza nada (o tamanho de um HMAC-SHA256 é público) e evita o `RangeError` do `timingSafeEqual`.
 */
export function isDemoOwner(ownerPhoneHash: Buffer, demoPhoneHash: Buffer | null): boolean {
  if (demoPhoneHash === null) return false
  if (ownerPhoneHash.length !== demoPhoneHash.length) return false
  return timingSafeEqual(ownerPhoneHash, demoPhoneHash)
}
