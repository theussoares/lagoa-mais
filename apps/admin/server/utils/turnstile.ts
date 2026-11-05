const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'
const SITEVERIFY_TIMEOUT_MS = 5000

type Fetcher = (url: string, init: RequestInit) => Promise<Response>

/**
 * Confere o captcha no servidor. Qualquer coisa fora de um `success: true` de verdade recusa (fail-closed). Com
 * `expectedHostname`, o token também precisa ter sido gerado nesse host (não vale um token de outro site com a mesma chave).
 */
export async function verifyTurnstile(token: string, secret: string, ip: string | undefined, fetcher: Fetcher = fetch, expectedHostname?: string): Promise<boolean> {
  if (token === '' || secret === '') return false
  const form = new URLSearchParams({ secret, response: token, ...(ip === undefined ? {} : { remoteip: ip }) })
  try {
    const response = await fetcher(SITEVERIFY_URL, { method: 'POST', body: form, signal: AbortSignal.timeout(SITEVERIFY_TIMEOUT_MS) })
    if (!response.ok) return false
    const body: unknown = await response.json()
    if (typeof body !== 'object' || body === null || !('success' in body) || body.success !== true) return false
    return expectedHostname === undefined || ('hostname' in body && body.hostname === expectedHostname)
  } catch {
    return false
  }
}
