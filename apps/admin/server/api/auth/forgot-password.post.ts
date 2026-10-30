import { getRequestIP, getRequestURL } from 'h3'
import { ADMIN_SET_PASSWORD_PATH } from '#shared/constants/domain'
import { AdminPasswordResetRequestSchema } from '#shared/schemas/admin'
import { createAdminLogin, readAdminConfig } from '../../utils/adminConfig'
import { failWith, rejectInput } from '../../utils/authResponse'
import { passesCaptcha, reserveAdminLoginAttempt } from '../../utils/loginAttempts'
import { requestPasswordReset } from '../../utils/loginFlow'
import { parsedBody } from '../../../../web/server/utils/input'

export default defineEventHandler(async (event) => {
  const body = await parsedBody(event, AdminPasswordResetRequestSchema)
  if (body === null) return rejectInput(event)
  const config = readAdminConfig()
  const clientIp = getRequestIP(event, { xForwardedFor: true })
  const origin = config.appUrl === '' ? getRequestURL(event).origin : config.appUrl.replace(/\/+$/, '')
  const result = await requestPasswordReset(
    {
      verifyCaptcha: (token) => passesCaptcha(config, token, clientIp),
      reserveAttempt: (email) => reserveAdminLoginAttempt(config, email, clientIp),
      sendReset: (email) => createAdminLogin().sendPasswordReset(email, `${origin}${ADMIN_SET_PASSWORD_PATH}`),
    },
    body,
  )
  return result.ok ? { ok: true } : failWith(event, result.code)
})
