import { HitItemReviewSchema } from '#shared/schemas/admin'
import { callAdminApi } from '../../../../utils/adminApi'
import { rejectInput } from '../../../../utils/authResponse'
import { parsedBody, uuidParam } from '../../../../../../web/server/utils/input'

export default defineEventHandler(async (event) => {
  const id = uuidParam(event, 'id')
  const body = await parsedBody(event, HitItemReviewSchema)
  if (id === null || body === null) return rejectInput(event)
  return callAdminApi(event, { method: 'POST', path: `/admin/hits/${id}/review`, body })
})
