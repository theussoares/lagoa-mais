import { createError, getRequestHeader, getRequestIP, readBody } from 'h3'
import { z } from 'zod'
import { failWith, rejectInput } from '../../utils/authResponse'
import { runDemoLogin } from '../../utils/demoLogin'
import { reserveLoginAttempt } from '../../utils/loginAttempts'
import { logSecurityEvent } from '../../utils/securityLog'
import { createPhoneLogin, readBffConfig, readDemoConfig } from '../../utils/serverConfig'
import { startSession } from '../../utils/sessionAccess'

const DemoBodySchema = z.object({ surface: z.enum(['customer', 'merchant']) })

/**
 * Entrada pela conta de demonstração: o mesmo `verifyOtp` do login, com o número e o código fixos (test phone do
 * Supabase) guardados só no servidor. O token é um JWT real e a API não sabe que é demo. Sem as envs, a rota não existe.
 */
export default defineEventHandler(async (event) => {
  const body = DemoBodySchema.safeParse(await readBody(event))
  if (!body.success) return rejectInput(event)
  const config = readBffConfig()
  const { customerUrl, merchantUrl } = useRuntimeConfig().public
  const outcome = await runDemoLogin(
    {
      surface: body.data.surface,
      host: getRequestHeader(event, 'x-forwarded-host') ?? getRequestHeader(event, 'host'),
      config: readDemoConfig(),
      urls: { customerUrl, merchantUrl },
    },
    {
      reserveAttempt: (phone) =>
        reserveLoginAttempt(
          { apiBaseUrl: config.apiBaseUrl, bffSharedSecret: config.bffSharedSecret, production: config.secureCookies, clientIp: getRequestIP(event, { xForwardedFor: true }) },
          phone,
        ),
      verifyCode: (phone, code) => createPhoneLogin().verifyCode(phone, code),
    },
  )
  if (outcome.kind === 'notFound') throw createError({ statusCode: 404 })
  if (outcome.kind === 'failure') {
    logSecurityEvent(event, { event: 'auth.demoLogin', outcome: 'failure', code: outcome.code })
    return failWith(event, outcome.code)
  }
  logSecurityEvent(event, { event: 'auth.demoLogin', outcome: 'success', userId: outcome.tokens.userId })
  startSession(event, outcome.tokens, { secure: config.secureCookies })
  return { ok: true }
})
