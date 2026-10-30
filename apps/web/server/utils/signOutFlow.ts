export interface SignOutTokens {
  readonly accessToken: string
  readonly refreshToken: string
}

export interface SignOutSteps {
  readonly stored: { readonly accessToken: string | undefined; readonly refreshToken: string | undefined }
  /** Refresh quando o `lagoa_at` venceu; `undefined` se falhou. */
  readonly renew: (refreshToken: string) => Promise<SignOutTokens | undefined>
  readonly revoke: (tokens: SignOutTokens) => Promise<void>
  readonly forget: (...refreshTokens: string[]) => void
  readonly clearCookies: () => void
}

/**
 * Com o `lagoa_at` vencido ainda dá para revogar no provedor: renova antes e revoga a sessão nova.
 * Os cookies são limpos sempre, mesmo se a renovação ou a revogação falharem.
 */
export async function signOutFlow({ stored, renew, revoke, forget, clearCookies }: SignOutSteps): Promise<void> {
  try {
    const tokens = await tokensToRevoke(stored, renew)
    if (tokens !== undefined) await revoke(tokens)
    forget(...[stored.refreshToken, tokens?.refreshToken].filter((token): token is string => token !== undefined))
  } finally {
    clearCookies()
  }
}

async function tokensToRevoke(stored: SignOutSteps['stored'], renew: SignOutSteps['renew']): Promise<SignOutTokens | undefined> {
  if (stored.refreshToken === undefined) return undefined
  if (stored.accessToken !== undefined) return { accessToken: stored.accessToken, refreshToken: stored.refreshToken }
  return renew(stored.refreshToken)
}
