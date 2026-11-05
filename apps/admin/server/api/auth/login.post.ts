import { getRequestIP } from 'h3'
import { AdminSignInSchema } from '#shared/schemas/admin'
import { createAdminLogin, readAdminConfig } from '../../utils/adminConfig'
import { startAdminSession } from '../../utils/adminSession'
import { failWith, rejectInput } from '../../utils/authResponse'
import { passesCaptcha, reserveAdminLoginAttempt } from '../../utils/loginAttempts'
import { login } from '../../utils/loginFlow'
import { logAdminSecurityEvent } from '../../utils/securityLog'
import { parsedBody } from '../../../../web/server/utils/input'

export default defineEventHandler(async (event) => {
  const body = await parsedBody(event, AdminSignInSchema)
  if (body === null) return rejectInput(event)
  const config = readAdminConfig()
  const clientIp = getRequestIP(event, { xForwardedFor: true })
  const auth = createAdminLogin()
  const result = await login(
    {
      verifyCaptcha: (token) => passesCaptcha(config, token, clientIp),
      reserveAttempt: (email) => reserveAdminLoginAttempt(config, email, clientIp),
      signIn: (email, password) => auth.signIn(email, password),
      signOut: (tokens) => auth.signOut(tokens),
      log: (entry) => logAdminSecurityEvent(event, entry),
    },
    body,
  )
  if (!result.ok) return failWith(event, result.code)
  startAdminSession(event, result.value.tokens, { secure: config.production })
  return { next: result.value.next }
})
