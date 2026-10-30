import type { H3Event } from 'h3'
import { logSecurityEvent } from '../../../web/server/utils/securityLog'
import type { AdminSecurityEntry } from '../types/auth'

/** Login e logout do admin no log da plataforma: só ids opacos e o código, nunca e-mail, senha ou código do autenticador. */
export const logAdminSecurityEvent = (event: H3Event, entry: AdminSecurityEntry): void => logSecurityEvent(event, entry)
