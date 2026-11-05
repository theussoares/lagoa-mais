import { FeaturedPlacementDraftSchema } from '#shared/schemas/featured'
import { callAdminApi } from '../../../utils/adminApi'
import { rejectInput } from '../../../utils/authResponse'
import { parsedBody } from '../../../../../web/server/utils/input'

export default defineEventHandler(async (event) => {
  const body = await parsedBody(event, FeaturedPlacementDraftSchema)
  if (body === null) return rejectInput(event)
  return callAdminApi(event, { method: 'POST', path: '/admin/featured', body })
})
