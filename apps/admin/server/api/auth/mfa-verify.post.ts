import { getRequestIP } from 'h3'
import { AdminMfaCodeSchema } from '#shared/schemas/admin'
import { readAdminConfig } from '../../utils/adminConfig'
import { startAdminSession } from '../../utils/adminSession'
import { failWith, rejectInput } from '../../utils/authResponse'
import { reserveAdminLoginAttempt } from '../../utils/loginAttempts'
import { verifyTarget } from '../../utils/mfaPlan'
import { openMfaContext } from '../../utils/mfaSession'
import { logAdminSecurityEvent } from '../../utils/securityLog'
import { parsedBody } from '../../../../web/server/utils/input'

/** Código do autenticador. Gasta do mesmo teto por e-mail da senha: seis dígitos não ficam abertos a tentativa sem fim. */
export default defineEventHandler(async (event) => {
  const body = await parsedBody(event, AdminMfaCodeSchema)
  if (body === null) return rejectInput(event)
  const context = await openMfaContext(event)
  if (!context.ok) return failWith(event, context.code)
  const { auth, aal, email, factors } = context.value
  const config = readAdminConfig()
  if (email === undefined) return failWith(event, 'internal')
  const reserved = await reserveAdminLoginAttempt(config, email, getRequestIP(event, { xForwardedFor: true }))
  if (!reserved.ok) return failWith(event, reserved.code)
  const target = verifyTarget(aal, factors)
  if (target === null) return failWith(event, 'invalidMfaCode')
  const verified = await auth.verify(target.factorId, body.code)
  if (!verified.ok) {
    logAdminSecurityEvent(event, { event: 'auth.login', outcome: 'failure', code: verified.code })
    return failWith(event, verified.code)
  }
  await auth.unenroll(target.replaces)
  logAdminSecurityEvent(event, { event: 'auth.login', outcome: 'success', code: aal === 'aal2' ? 'mfaReplaced' : 'mfaOk', userId: verified.value.userId })
  startAdminSession(event, verified.value, { secure: config.production })
  return { ok: true }
})
