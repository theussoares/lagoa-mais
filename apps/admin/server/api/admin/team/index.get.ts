import { callAdminApi } from '../../../utils/adminApi'

export default defineEventHandler((event) => callAdminApi(event, { method: 'GET', path: '/admin/team' }))
