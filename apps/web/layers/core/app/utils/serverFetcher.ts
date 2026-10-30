import type { ServerFetcherOptions } from '../types/http'

const ZERO_MAX_AGE = /^\s*max-age\s*=\s*0+\s*$/i

/** Aplica um `Set-Cookie` ao cabeçalho `cookie` do pedido: valor novo substitui o antigo, cookie expirado sai. */
export function applySetCookie(cookieHeader: string | undefined, setCookie: string): string {
  const [pair = '', ...attributes] = setCookie.split(';')
  const separator = pair.indexOf('=')
  if (separator <= 0) return cookieHeader ?? ''
  const name = pair.slice(0, separator).trim()
  const value = pair.slice(separator + 1).trim()
  const expired = value === '' || attributes.some((attribute) => ZERO_MAX_AGE.test(attribute))
  const kept = (cookieHeader ?? '')
    .split(';')
    .map((part) => part.trim())
    .filter((part) => part !== '' && part.split('=')[0]?.trim() !== name)
  return (expired ? kept : [...kept, `${name}=${value}`]).join('; ')
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
