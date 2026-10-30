import { AdminUserSchema, type AdminSession } from '#shared/schemas/admin'
import { fetchAdminApi } from '../../utils/adminApi'
import { readAdminConfig } from '../../utils/adminConfig'
import { endAdminSession } from '../../utils/adminSession'
import { failWith } from '../../utils/authResponse'
import { mfaStep } from '../../utils/mfaPlan'
import { openMfaContext } from '../../utils/mfaSession'

const SESSION_GONE: readonly number[] = [401, 403]

/** Onde o admin está: sem sessão (`null`), no meio do MFA (`next`) ou dentro (nome). Quem decide se ainda é admin é a API. */
export default defineEventHandler(async (event): Promise<AdminSession | { code: string }> => {
  const context = await openMfaContext(event)
  if (!context.ok) return context.code === 'unauthorized' ? null : failWith(event, context.code)
  const step = mfaStep(context.value.aal, context.value.factors)
  if (step !== 'done') return { next: step }
  const me = await fetchAdminApi(event, { method: 'GET', path: '/admin/team/me' })
  if (!me.ok) return me.code === 'unauthorized' ? null : failWith(event, me.code)
  if (SESSION_GONE.includes(me.value.status)) {
    endAdminSession(event, { secure: readAdminConfig().production })
    return null
  }
  const admin = AdminUserSchema.safeParse(JSON.parse(me.value.body.toString('utf8') || 'null'))
  return admin.success ? { admin: { name: admin.data.name } } : failWith(event, me.value.status >= 500 ? 'network' : 'internal')
})
