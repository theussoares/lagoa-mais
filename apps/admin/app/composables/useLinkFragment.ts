import type { LinkFragment } from '../types/views'

const LINK_KINDS = ['invite', 'recovery'] as const

/**
 * Lê os tokens que o Supabase põe no fragmento do link do e-mail e apaga o fragmento da barra (não fica no histórico).
 * O fragmento nunca vai ao servidor: os tokens só saem daqui no corpo do POST de definir a senha.
 */
export function useLinkFragment(): LinkFragment {
  const params = new URLSearchParams(window.location.hash.slice(1))
  window.history.replaceState(null, '', window.location.pathname)
  const accessToken = params.get('access_token')
  const refreshToken = params.get('refresh_token')
  const kind = LINK_KINDS.find((known) => known === params.get('type'))
  if (accessToken === null || refreshToken === null || kind === undefined) return { status: 'invalid' }
  return { status: 'ok', accessToken, refreshToken, kind }
}
