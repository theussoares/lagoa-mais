import { createPhoneLogin, readBffConfig } from '../../utils/serverConfig'
import { logSecurityEvent } from '../../utils/securityLog'
import { endSession, forgetRefresh, renewSession, storedTokens } from '../../utils/sessionAccess'
import { signOutFlow } from '../../utils/signOutFlow'

export default defineEventHandler(async (event) => {
  const settings = { secure: readBffConfig().secureCookies }
  await signOutFlow({
    stored: storedTokens(event),
    renew: async (stale) => {
      const renewed = await renewSession(event, stale, settings)
      return renewed.ok ? renewed.value : undefined
    },
    revoke: (tokens) => createPhoneLogin().signOut(tokens),
    forget: forgetRefresh,
    clearCookies: () => endSession(event, settings),
  })
  logSecurityEvent(event, { event: 'auth.logout', outcome: 'success' })
  return { ok: true }
})
