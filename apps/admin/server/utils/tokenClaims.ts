import { z } from 'zod'
import type { AssuranceLevel } from '../types/auth'

const ClaimsSchema = z.object({
  sub: z.string().min(1),
  aal: z.enum(['aal1', 'aal2']),
  email: z.string().optional(),
  app_metadata: z.object({ role: z.unknown().optional() }).optional(),
})

export interface TokenClaims {
  readonly sub: string
  readonly aal: AssuranceLevel
  readonly email: string | undefined
  readonly isAdmin: boolean
}

/**
 * Lê o corpo do JWT sem conferir a assinatura: o token veio do nosso cookie httpOnly e só decide o passo do login (MFA
 * ou não). Quem confia nele é a API, que confere a assinatura e o `admin_users` a cada pedido.
 */
export function claimsOf(token: string): TokenClaims | null {
  const [, payload] = token.split('.')
  if (payload === undefined) return null
  try {
    const parsed = ClaimsSchema.safeParse(JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')))
    if (!parsed.success) return null
    const { sub, aal, email, app_metadata: metadata } = parsed.data
    return { sub, aal, email, isAdmin: metadata?.role === 'admin' }
  } catch {
    return null
  }
}
