import { failWith } from '../../utils/authResponse'
import { canEnroll } from '../../utils/mfaPlan'
import { openMfaContext } from '../../utils/mfaSession'

/** QR do autenticador novo: no primeiro acesso, ou em Minha conta com a sessão completa (trocar de aparelho). */
export default defineEventHandler(async (event) => {
  const context = await openMfaContext(event)
  if (!context.ok) return failWith(event, context.code)
  const { auth, aal, factors } = context.value
  if (!canEnroll(aal, factors)) return failWith(event, 'forbidden')
  const enrolled = await auth.enroll(factors.pending)
  return enrolled.ok ? enrolled.value : failWith(event, enrolled.code)
})
