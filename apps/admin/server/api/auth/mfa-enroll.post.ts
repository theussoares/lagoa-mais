import { AdminMfaEnrollRequestSchema } from '#shared/schemas/admin'
import { readAdminConfig } from '../../utils/adminConfig'
import { startAdminSession } from '../../utils/adminSession'
import { failWith, rejectInput } from '../../utils/authResponse'
import { confirmCurrentFactor } from '../../utils/currentFactor'
import { canEnroll } from '../../utils/mfaPlan'
import { openMfaContext } from '../../utils/mfaSession'
import { parsedBody } from '../../../../web/server/utils/input'

/**
 * QR do autenticador novo: no primeiro acesso, ou em Minha conta com a sessão completa e o código do atual (trocar de
 * aparelho não fica ao alcance de uma sessão roubada).
 */
export default defineEventHandler(async (event) => {
  const body = await parsedBody(event, AdminMfaEnrollRequestSchema)
  if (body === null) return rejectInput(event)
  const context = await openMfaContext(event)
  if (!context.ok) return failWith(event, context.code)
  const { auth, aal, factors } = context.value
  if (!canEnroll(aal, factors)) return failWith(event, 'forbidden')
  const confirmed = await confirmCurrentFactor(event, context.value, body.currentCode)
  if (!confirmed.ok) return failWith(event, confirmed.code)
  if (confirmed.value !== null) startAdminSession(event, confirmed.value, { secure: readAdminConfig().production })
  const enrolled = await auth.enroll(factors.pending)
  return enrolled.ok ? enrolled.value : failWith(event, enrolled.code)
})
