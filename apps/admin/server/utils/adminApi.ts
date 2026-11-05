import { getRequestHeaders, getRequestIP, setResponseHeaders, setResponseStatus, type H3Event } from 'h3'
import { buildUpstreamUrl, requestHeadersFor, responseHeadersFor } from '../../../web/server/utils/upstream'
import type { AdminApiCall, AdminApiResponse } from '../types/api'
import type { AdminAuthOutcome } from '../types/auth'
import { readAdminConfig } from './adminConfig'
import { failWith } from './authResponse'
import { resolveAdminTokens } from './adminSession'

const NO_CONTENT = 204

function searchOf(query: AdminApiCall['query']): string {
  if (query === undefined) return ''
  const entries = Object.entries(query).flatMap(([key, value]) => (value === undefined ? [] : [[key, String(value)]]))
  const search = new URLSearchParams(entries).toString()
  return search === '' ? '' : `?${search}`
}

/** Chama a API em nome do admin logado (cookie → Bearer). Só cabeçalhos de uma lista fechada vão e voltam. */
export async function fetchAdminApi(event: H3Event, call: AdminApiCall): Promise<AdminAuthOutcome<AdminApiResponse>> {
  const config = readAdminConfig()
  const tokens = await resolveAdminTokens(event, { secure: config.production })
  if (!tokens.ok) return tokens
  const bff = { secret: config.bffSharedSecret, clientIp: getRequestIP(event, { xForwardedFor: true }) }
  const forwarded = requestHeadersFor(new Headers(getRequestHeaders(event) as Record<string, string>), tokens.value.accessToken, bff)
  const { 'content-type': _browserType, ...headers } = forwarded
  const hasBody = call.body !== undefined
  const response = await fetch(buildUpstreamUrl({ baseUrl: config.apiBaseUrl, path: call.path, search: searchOf(call.query) }), {
    method: call.method,
    headers: hasBody ? { ...headers, 'content-type': 'application/json' } : headers,
    ...(hasBody ? { body: JSON.stringify(call.body) } : {}),
  }).catch(() => null)
  if (response === null) return { ok: false, code: 'network' }
  return { ok: true, value: { status: response.status, headers: response.headers, body: Buffer.from(await response.arrayBuffer()) } }
}

/** Repassa a resposta da API ao navegador como ela veio (status e corpo `{ code }` inclusos). */
export async function callAdminApi(event: H3Event, call: AdminApiCall): Promise<unknown> {
  const result = await fetchAdminApi(event, call)
  if (!result.ok) return failWith(event, result.code)
  setResponseStatus(event, result.value.status)
  setResponseHeaders(event, responseHeadersFor(result.value.headers))
  return result.value.status === NO_CONTENT ? null : result.value.body
}
