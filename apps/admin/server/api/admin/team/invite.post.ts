import { AdminInviteSchema } from '#shared/schemas/admin'
import { callAdminApi } from '../../../utils/adminApi'
import { rejectInput } from '../../../utils/authResponse'
import { parsedBody } from '../../../../../web/server/utils/input'

export default defineEventHandler(async (event) => {
  const body = await parsedBody(event, AdminInviteSchema)
  if (body === null) return rejectInput(event)
  return callAdminApi(event, { method: 'POST', path: '/admin/team/invite', body })
})
