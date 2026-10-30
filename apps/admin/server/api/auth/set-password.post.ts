import { AdminSetPasswordSchema } from '#shared/schemas/admin'
import { failWith, rejectInput } from '../../utils/authResponse'
import { confirmCurrentFactor } from '../../utils/currentFactor'
import { openContextFor } from '../../utils/mfaSession'
import { parsedBody } from '../../../../web/server/utils/input'

/**
 * Senha pelo link do convite ou da recuperação. Conta que já tem autenticador (recuperação) só troca com o código dele:
 * o link abre uma sessão só com o e-mail, e o Supabase pede `aal2` para trocar a senha. Não abre sessão no painel:
 * depois a pessoa entra com a senha nova e o autenticador. Link de conta que não é de admin vale o mesmo que vencido.
 */
export default defineEventHandler(async (event) => {
  const body = await parsedBody(event, AdminSetPasswordSchema)
  if (body === null) return rejectInput(event)
  const context = await openContextFor(event, body, { persist: false })
  if (!context.ok) return failWith(event, context.code === 'unauthorized' ? 'linkExpired' : context.code)
  const confirmed = await confirmCurrentFactor(event, context.value, body.code)
  if (!confirmed.ok) return failWith(event, confirmed.code)
  const { auth } = context.value
  const updated = await auth.updatePassword(body.password)
  if (!updated.ok) return failWith(event, updated.code === 'unauthorized' ? 'linkExpired' : updated.code)
  await auth.signOut(confirmed.value ?? context.value.tokens)
  return { ok: true }
})
