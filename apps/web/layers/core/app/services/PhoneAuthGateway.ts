import type { PhoneNumber } from '#shared/schemas/phone'
import type { LoginCode } from '#shared/schemas/session'
import type { Result } from '#shared/types/result'
import type { SignInError } from './AuthService'
import type { TransportError } from '#shared/types/errors'
import type { DemoSurface } from '../types/signIn'

/** Provedor do login por celular (hoje o Supabase Auth, atrás do BFF do Nuxt): manda o SMS, confere o código e abre a sessão (cookie httpOnly, que o navegador nem lê). */
export interface PhoneAuthGateway {
  sendCode(phone: PhoneNumber): Promise<Result<true, TransportError>>
  verifyCode(phone: PhoneNumber, code: LoginCode): Promise<Result<true, SignInError>>
  /** A conta de demonstração desta superfície está ligada no servidor? Só um booleano: o número nunca chega ao navegador. */
  demoAvailable(surface: DemoSurface): Promise<boolean>
  /** Entra pela conta de demonstração, sem SMS: o servidor usa o número e o código que só ele conhece. */
  demoSignIn(surface: DemoSurface): Promise<Result<true, SignInError>>
  /** `err` só quando o servidor não respondeu: o cookie httpOnly continua valendo e quem chamou precisa saber. */
  signOut(): Promise<Result<true, TransportError>>
}
