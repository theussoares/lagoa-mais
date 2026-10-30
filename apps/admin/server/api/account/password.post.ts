import { AdminPasswordChangeSchema } from '#shared/schemas/admin'
import { readAdminConfig } from '../../utils/adminConfig'
import { startAdminSession } from '../../utils/adminSession'
import { failWith, rejectInput } from '../../utils/authResponse'
import { confirmCurrentFactor } from '../../utils/currentFactor'
import { openMfaContext } from '../../utils/mfaSession'
import { parsedBody } from '../../../../web/server/utils/input'

/** Trocar a senha em Minha conta: sessão completa e o código atual do autenticador (uma sessão roubada não basta). */
export default defineEventHandler(async (event) => {
  const body = await parsedBody(event, AdminPasswordChangeSchema)
  if (body === null) return rejectInput(event)
  const context = await openMfaContext(event)
  if (!context.ok) return failWith(event, context.code)
  if (context.value.aal !== 'aal2') return failWith(event, 'forbidden')
  const confirmed = await confirmCurrentFactor(event, context.value, body.currentCode)
  if (!confirmed.ok) return failWith(event, confirmed.code)
  if (confirmed.value !== null) startAdminSession(event, confirmed.value, { secure: readAdminConfig().production })
  const updated = await context.value.auth.updatePassword(body.password)
  return updated.ok ? { ok: true } : failWith(event, updated.code)
})
