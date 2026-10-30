import { AdminShopListQuerySchema } from '#shared/schemas/admin'
import { callAdminApi } from '../../../utils/adminApi'
import { rejectInput } from '../../../utils/authResponse'
import { parsedQuery } from '../../../../../web/server/utils/input'

export default defineEventHandler((event) => {
  const query = parsedQuery(event, AdminShopListQuerySchema)
  if (query === null) return rejectInput(event)
  return callAdminApi(event, { method: 'GET', path: '/admin/shops', query })
})
