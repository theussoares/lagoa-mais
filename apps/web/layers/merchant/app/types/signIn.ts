import type { Ref } from 'vue'
import type { PhoneSignInStep } from '#layers/core/app/types/signIn'
import type { DomainErrorCode } from '#shared/types/errors'

export type MerchantSignInStep = PhoneSignInStep

/** `signUp`: celular confirmado sem loja; a página leva ao Criar o clube. */
export type MerchantSignInOutcome = 'signedIn' | 'signUp' | 'failed'

export interface MerchantSignIn {
  step: Readonly<Ref<MerchantSignInStep>>
  pending: Readonly<Ref<boolean>>
  error: Readonly<Ref<DomainErrorCode | null>>
  resendIn: Readonly<Ref<number>>
  /** A conta de demonstração está ligada no servidor (o botão só aparece então). */
  demoEnabled: Readonly<Ref<boolean>>
  requestCode: (rawPhone: string) => Promise<void>
  resendCode: () => Promise<void>
  verify: (rawCode: string) => Promise<MerchantSignInOutcome>
  /** Entra pela conta de demonstração, sem SMS. */
  signInDemo: () => Promise<MerchantSignInOutcome>
  changePhone: () => void
}
