import { AdminSetPasswordSchema } from '#shared/schemas/admin'
import { createAdminLogin } from '../../utils/adminConfig'
import { failWith, rejectInput } from '../../utils/authResponse'
import { claimsOf } from '../../utils/tokenClaims'
import { parsedBody } from '../../../../web/server/utils/input'

/**
 * Senha pelo link do convite ou da recuperação. Não abre sessão no painel: depois a pessoa entra com a senha nova e o
 * autenticador, como sempre. Link de conta que não é de admin vale o mesmo que link vencido.
 */
export default defineEventHandler(async (event) => {
  const body = await parsedBody(event, AdminSetPasswordSchema)
  if (body === null) return rejectInput(event)
  if (claimsOf(body.accessToken)?.isAdmin !== true) return failWith(event, 'linkExpired')
  const auth = createAdminLogin()
  const opened = await auth.use(body)
  if (!opened.ok) return failWith(event, opened.code === 'unauthorized' ? 'linkExpired' : opened.code)
  const updated = await auth.updatePassword(body.password)
  if (!updated.ok) return failWith(event, updated.code === 'unauthorized' ? 'linkExpired' : updated.code)
  await auth.signOut(body)
  return { ok: true }
})
