import { AdminPasswordChangeSchema } from '#shared/schemas/admin'
import { failWith, rejectInput } from '../../utils/authResponse'
import { openMfaContext } from '../../utils/mfaSession'
import { parsedBody } from '../../../../web/server/utils/input'

/** Trocar a senha em Minha conta: só com a sessão completa (senha + autenticador). */
export default defineEventHandler(async (event) => {
  const body = await parsedBody(event, AdminPasswordChangeSchema)
  if (body === null) return rejectInput(event)
  const context = await openMfaContext(event)
  if (!context.ok) return failWith(event, context.code)
  if (context.value.aal !== 'aal2') return failWith(event, 'forbidden')
  const updated = await context.value.auth.updatePassword(body.password)
  return updated.ok ? { ok: true } : failWith(event, updated.code)
})
