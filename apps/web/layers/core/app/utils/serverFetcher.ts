import type { ServerFetcherOptions } from '../types/http'

/** Cookies de sessão do BFF (`server/utils/sessionCookies.ts`); qualquer outro `Set-Cookie` não mexe no pedido interno. */
const SESSION_COOKIES: readonly string[] = ['lagoa_at', 'lagoa_rt']
const ZERO_MAX_AGE = /^max-age\s*=\s*0+$/i

function attributeValue(attributes: readonly string[], name: string): string | undefined {
  for (const attribute of attributes) {
    const separator = attribute.indexOf('=')
    if (separator > 0 && attribute.slice(0, separator).trim().toLowerCase() === name) return attribute.slice(separator + 1).trim()
  }
  return undefined
}

function isExpired(value: string, attributes: readonly string[], now: number): boolean {
  if (value === '' || attributes.some((attribute) => ZERO_MAX_AGE.test(attribute.trim()))) return true
  const expires = attributeValue(attributes, 'expires')
  return expires !== undefined && Date.parse(expires) <= now
}

/**
 * Aplica um `Set-Cookie` do BFF ao cabeçalho `cookie` do pedido: só os cookies de sessão em `Path=/` (o apagar do
 * caminho antigo `/api` não pode tirar o cookie de `/`); valor novo substitui o antigo, expirado sai.
 */
export function applySetCookie(cookieHeader: string | undefined, setCookie: string, now: number = Date.now()): string {
  const current = cookieHeader ?? ''
  const [pair = '', ...rest] = setCookie.split(';')
  const attributes = rest.map((attribute) => attribute.trim())
  const separator = pair.indexOf('=')
  if (separator <= 0 || attributeValue(attributes, 'path') !== '/') return current
  const name = pair.slice(0, separator).trim()
  if (!SESSION_COOKIES.includes(name)) return current
  const value = pair.slice(separator + 1).trim()
  const kept = current
    .split(';')
    .map((part) => part.trim())
    .filter((part) => part !== '' && part.split('=')[0]?.trim() !== name)
  return (isExpired(value, attributes, now) ? kept : [...kept, `${name}=${value}`]).join('; ')
}

/**
 * `fetch` para o SSR: chama o próprio `/api` (BFF) em memória, com o cookie do pedido, e devolve a `Response`
 * que o `ApiClient` trata igual ao navegador. O `Set-Cookie` do BFF (refresh do token) volta para a resposta da página
 * e também passa a valer nas chamadas seguintes da mesma renderização: sem isso cada uma reusaria o refresh token já rotado.
 */
export function createServerFetcher({ localFetch, forwarded, onSetCookie }: ServerFetcherOptions): typeof fetch {
  let cookieHeader = forwarded.cookie
  return async (input, init) => {
    const base = cookieHeader === undefined ? forwarded : { ...forwarded, cookie: cookieHeader }
    const response = await localFetch(String(input), { ...init, headers: { ...base, ...(init?.headers as Record<string, string> | undefined) } })
    for (const cookie of response.headers.getSetCookie()) {
      onSetCookie(cookie)
      cookieHeader = applySetCookie(cookieHeader, cookie)
    }
    return response
  }
}
