import { PhoneNumberSchema, type PhoneNumber } from '#shared/schemas/phone'
import { LoginCodeSchema, type LoginCode } from '#shared/schemas/session'
import type { AuthErrorCode, AuthOutcome, TokenPair } from '../types/auth'

export type DemoSurface = 'customer' | 'merchant'

/** Envs server-only da conta de demonstração. Qualquer campo vazio ou inválido desliga a superfície. */
export interface DemoConfig {
  readonly customerPhone: string
  readonly merchantPhone: string
  readonly otp: string
}

export interface DemoCredentials {
  readonly phone: PhoneNumber
  readonly code: LoginCode
}

export type DemoAvailability = Readonly<Record<DemoSurface, boolean>>

export interface SurfaceUrls {
  readonly customerUrl: string
  readonly merchantUrl: string
}

/** Número e código da superfície, ou `null` quando a demo não está configurada (a rota então nem existe: 404). */
export function demoCredentialsFor(config: DemoConfig, surface: DemoSurface): DemoCredentials | null {
  const phone = PhoneNumberSchema.safeParse(surface === 'customer' ? config.customerPhone : config.merchantPhone)
  const code = LoginCodeSchema.safeParse(config.otp)
  return phone.success && code.success ? { phone: phone.data, code: code.data } : null
}

function hostOf(origin: string): string | null {
  try {
    return new URL(origin).host
  } catch {
    return null
  }
}

/**
 * Com a separação de hosts ligada, cada conta de demonstração só entra no seu host (cliente em `app.`, lojista em
 * `balcao.`). Sem a separação (dev), vale em qualquer host.
 */
export function demoSurfaceMatchesHost(surface: DemoSurface, host: string | undefined, { customerUrl, merchantUrl }: SurfaceUrls): boolean {
  const customerHost = hostOf(customerUrl)
  const merchantHost = hostOf(merchantUrl)
  if (customerHost === null || merchantHost === null) return true
  return host === (surface === 'customer' ? customerHost : merchantHost)
}

export function isDemoAvailable(config: DemoConfig, surface: DemoSurface, host: string | undefined, urls: SurfaceUrls): boolean {
  return demoCredentialsFor(config, surface) !== null && demoSurfaceMatchesHost(surface, host, urls)
}

export interface DemoLoginRequest {
  readonly surface: DemoSurface
  readonly host: string | undefined
  readonly config: DemoConfig
  readonly urls: SurfaceUrls
}

/** O que o login de demonstração pede ao mundo de fora: o teto por celular e o `verifyOtp` do Supabase. */
export interface DemoLoginPorts {
  reserveAttempt(phone: PhoneNumber): Promise<AuthOutcome<true>>
  verifyCode(phone: PhoneNumber, code: LoginCode): Promise<AuthOutcome<TokenPair>>
}

export type DemoLoginOutcome =
  /** Sem envs, ou superfície no host errado: a rota responde 404 como se não existisse. */
  | { readonly kind: 'notFound' }
  | { readonly kind: 'failure'; readonly code: AuthErrorCode }
  | { readonly kind: 'success'; readonly tokens: TokenPair }

/** Mesmo caminho do login por código (teto por celular, depois `verifyOtp`), com o número e o código fixos da superfície. */
export async function runDemoLogin(request: DemoLoginRequest, ports: DemoLoginPorts): Promise<DemoLoginOutcome> {
  const credentials = demoCredentialsFor(request.config, request.surface)
  if (credentials === null || !demoSurfaceMatchesHost(request.surface, request.host, request.urls)) return { kind: 'notFound' }
  const reserved = await ports.reserveAttempt(credentials.phone)
  if (!reserved.ok) return { kind: 'failure', code: reserved.code }
  const verified = await ports.verifyCode(credentials.phone, credentials.code)
  return verified.ok ? { kind: 'success', tokens: verified.value } : { kind: 'failure', code: verified.code }
}

/** O que o front pode saber: só se o botão aparece, nunca o número nem o código. */
export function demoAvailability(config: DemoConfig, host: string | undefined, urls: SurfaceUrls): DemoAvailability {
  return {
    customer: isDemoAvailable(config, 'customer', host, urls),
    merchant: isDemoAvailable(config, 'merchant', host, urls),
  }
}
