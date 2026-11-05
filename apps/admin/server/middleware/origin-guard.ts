import { createError, getRequestHeader, getRequestURL } from 'h3'
import { isTrustedOrigin } from '../../../web/server/utils/originGuard'
import { readAdminConfig } from '../utils/adminConfig'

/** CSRF do cookie do admin em `/api/**`: escrita só do próprio painel ou de uma origem liberada. */
export default defineEventHandler((event) => {
  if (!getRequestURL(event).pathname.startsWith('/api/')) return
  const trusted = isTrustedOrigin({
    method: event.method,
    origin: getRequestHeader(event, 'origin'),
    host: getRequestHeader(event, 'x-forwarded-host') ?? getRequestHeader(event, 'host'),
    allowedOrigins: readAdminConfig().allowedOrigins,
  })
  if (!trusted) throw createError({ statusCode: 403, data: { code: 'forbidden' } })
})
