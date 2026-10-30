import { SECURITY_HEADERS } from '../../../web/server/utils/securityHeaders'

/** Como a do app, mas ninguém emoldura o painel, nem o próprio site: quem aprova loja não clica em nada por baixo. */
const ADMIN_BASE_CSP = "frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self'"

/** O HTML da SPA leva o `window.__NUXT__` inline: entra pelo nonce desta resposta, e o resto pelo `strict-dynamic`. */
export function adminContentSecurityPolicy(nonce: string): string {
  return `${ADMIN_BASE_CSP}; script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`
}

export const ADMIN_SECURITY_HEADERS: Readonly<Record<string, string>> = {
  ...SECURITY_HEADERS,
  'Content-Security-Policy': ADMIN_BASE_CSP,
  'X-Frame-Options': 'DENY',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
  'X-Robots-Tag': 'noindex, nofollow',
}
