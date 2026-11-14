import { getRequestHeader } from 'h3'
import { HOME_SCREEN_IDENTITY, isMerchantHost } from '../utils/webManifest'

/** No host do Balcão o `<head>` sai com o nome e o ícone do Balcão (o iPhone os lê no HTML, inclusive nas rotas SPA). */
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('render:html', (html, { event }) => {
    const host = getRequestHeader(event, 'x-forwarded-host') ?? getRequestHeader(event, 'host')
    if (!isMerchantHost({ merchantUrl: useRuntimeConfig(event).public.merchantUrl, host })) return
    const { customer, merchant } = HOME_SCREEN_IDENTITY
    html.head = html.head.map((chunk) =>
      chunk
        .replace(`name="apple-mobile-web-app-title" content="${customer.title}"`, `name="apple-mobile-web-app-title" content="${merchant.title}"`)
        .replace(`href="${customer.touchIcon}"`, `href="${merchant.touchIcon}"`),
    )
  })
})
