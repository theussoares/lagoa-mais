import { getCookie } from 'h3'
import { ADMIN_ACCESS_COOKIE, ADMIN_REFRESH_COOKIE } from '../../utils/adminCookies'
import { createAdminLogin, readAdminConfig } from '../../utils/adminConfig'
import { endAdminSession } from '../../utils/adminSession'
import { logAdminSecurityEvent } from '../../utils/securityLog'
import { claimsOf } from '../../utils/tokenClaims'

export default defineEventHandler(async (event) => {
  const accessToken = getCookie(event, ADMIN_ACCESS_COOKIE)
  const refreshToken = getCookie(event, ADMIN_REFRESH_COOKIE)
  if (accessToken !== undefined && refreshToken !== undefined) await createAdminLogin().signOut({ accessToken, refreshToken }).catch(() => undefined)
  endAdminSession(event, { secure: readAdminConfig().production })
  const userId = accessToken === undefined ? undefined : claimsOf(accessToken)?.sub
  logAdminSecurityEvent(event, { event: 'auth.logout', outcome: 'success', ...(userId === undefined ? {} : { userId }) })
  return { ok: true }
})
