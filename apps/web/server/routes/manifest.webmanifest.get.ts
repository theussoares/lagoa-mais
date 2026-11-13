import { getRequestHeader, setResponseHeader } from 'h3'
import { buildWebManifest } from '../utils/webManifest'

export default defineEventHandler((event) => {
  setResponseHeader(event, 'content-type', 'application/manifest+json')
  // Varia por host: sem isso um cache compartilhado serviria o manifest do cliente no Balcão.
  setResponseHeader(event, 'vary', 'host, x-forwarded-host')
  return buildWebManifest({
    merchantUrl: useRuntimeConfig().public.merchantUrl,
    host: getRequestHeader(event, 'x-forwarded-host') ?? getRequestHeader(event, 'host'),
  })
})
