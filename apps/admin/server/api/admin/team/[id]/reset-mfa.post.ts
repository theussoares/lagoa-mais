import { callAdminApi } from '../../../../utils/adminApi'
import { rejectInput } from '../../../../utils/authResponse'
import { uuidParam } from '../../../../../../web/server/utils/input'

export default defineEventHandler((event) => {
  const id = uuidParam(event, 'id')
  if (id === null) return rejectInput(event)
  return callAdminApi(event, { method: 'POST', path: `/admin/team/${id}/reset-mfa` })
})
