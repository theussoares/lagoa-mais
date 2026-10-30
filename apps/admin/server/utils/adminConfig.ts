import { createClient } from '@supabase/supabase-js'
import { parseAllowedOrigins } from '../../../web/server/utils/originGuard'
import { AdminLogin } from './adminLogin'

export interface AdminBffConfig {
  readonly apiBaseUrl: string
  readonly bffSharedSecret: string
  readonly turnstileSecret: string
  readonly allowedOrigins: string[]
  readonly appUrl: string
  readonly production: boolean
}

/** Tudo que o BFF do admin lê do ambiente, num lugar só. Nada disto vai para o navegador. */
export function readAdminConfig(): AdminBffConfig {
  const config = useRuntimeConfig()
  return {
    apiBaseUrl: config.apiBaseUrl,
    bffSharedSecret: config.bffSharedSecret,
    turnstileSecret: config.turnstileSecret,
    allowedOrigins: parseAllowedOrigins(config.allowedOrigins),
    appUrl: config.appUrl,
    production: process.env.NODE_ENV === 'production',
  }
}

export function createAdminLogin(): AdminLogin {
  const config = useRuntimeConfig()
  const client = createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
  return new AdminLogin(client)
}
