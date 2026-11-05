import { setResponseStatus, type H3Event } from 'h3'
import type { AdminAuthErrorCode } from '../types/auth'
import { adminAuthErrorStatus } from './authErrors'

/** Corpo de erro no mesmo formato da API (`{ code }`). */
export function failWith(event: H3Event, code: AdminAuthErrorCode): { code: AdminAuthErrorCode } {
  setResponseStatus(event, adminAuthErrorStatus(code))
  return { code }
}

/** Entrada do navegador fora do contrato: nem chega à API nem ao Supabase. */
export function rejectInput(event: H3Event): { code: 'internal' } {
  setResponseStatus(event, 400)
  return { code: 'internal' }
}
