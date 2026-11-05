import { addNonce, createNonce, nonceMetaTag } from '../../../web/server/utils/contentSecurityPolicy'
import { adminContentSecurityPolicy } from '../utils/adminSecurityHeaders'

/** Mesmo esquema do app: cada HTML sai com um nonce novo nos scripts e no `script-src` do header. */
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('render:html', (html, { event }) => {
    const nonce = createNonce()
    const withNonce = (chunks: string[]): string[] => chunks.map((chunk) => addNonce(chunk, nonce))
    html.head = [nonceMetaTag(nonce), ...withNonce(html.head)]
    html.bodyPrepend = withNonce(html.bodyPrepend)
    html.body = withNonce(html.body)
    html.bodyAppend = withNonce(html.bodyAppend)
    setResponseHeader(event, 'Content-Security-Policy', adminContentSecurityPolicy(nonce))
  })
})
