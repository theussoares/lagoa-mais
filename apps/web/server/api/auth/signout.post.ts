import { createPhoneLogin, readBffConfig } from '../../utils/serverConfig'
import { logSecurityEvent } from '../../utils/securityLog'
import { endSession, forgetRefresh, renewSession, storedTokens } from '../../utils/sessionAccess'

export default defineEventHandler(async (event) => {
  const settings = { secure: readBffConfig().secureCookies }
  const { accessToken, refreshToken } = storedTokens(event)
  const tokens = await revocableTokens(accessToken, refreshToken, async (stale) => {
    const renewed = await renewSession(event, stale, settings)
    return renewed.ok ? renewed.value : undefined
  })
  if (tokens !== undefined) await createPhoneLogin().signOut(tokens)
  forgetRefresh(...[refreshToken, tokens?.refreshToken].filter((token): token is string => token !== undefined))
  endSession(event, settings)
  logSecurityEvent(event, { event: 'auth.logout', outcome: 'success' })
  return { ok: true }
})

/** Com o `lagoa_at` vencido ainda dá para revogar no provedor: renova antes e revoga a sessão nova. */
async function revocableTokens(
  accessToken: string | undefined,
  refreshToken: string | undefined,
  renew: (refreshToken: string) => Promise<{ accessToken: string; refreshToken: string } | undefined>,
): Promise<{ accessToken: string; refreshToken: string } | undefined> {
  if (refreshToken === undefined) return undefined
  if (accessToken !== undefined) return { accessToken, refreshToken }
  return renew(refreshToken)
}
