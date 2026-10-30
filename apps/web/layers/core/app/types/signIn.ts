import type { CustomerRegistration } from '#shared/schemas/customer'
import type { PhoneNumber } from '#shared/schemas/phone'
import type { CustomerSession } from '#shared/schemas/session'

/** Quem pode entrar pela conta de demonstração: o app do cliente ou o Balcão. */
export type DemoSurface = 'customer' | 'merchant'

/** Passo do login por celular + código, igual para cliente e lojista. */
export type PhoneSignInStep = { name: 'phone' } | { name: 'code'; phone: PhoneNumber }

/** Código confirmado: quem já tem conta entra; quem é novo ainda precisa contar o nome (e, se quiser, o e-mail). */
export type CustomerSignInResult = { kind: 'signedIn'; session: CustomerSession } | { kind: 'signUp' }

/** O que o app pede no cadastro: nome obrigatório, e-mail opcional. O celular vem do token. */
export type CustomerSignUp = Required<Pick<CustomerRegistration, 'firstName'>> & Pick<CustomerRegistration, 'email'>
