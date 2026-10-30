import type { AdminSession } from '#shared/schemas/admin'

export const SIGN_IN_PATH = '/entrar'
export const MFA_PATH = '/autenticador'
export const HOME_PATH = '/lojas'

/** Abrem sem sessão: entrar, pedir o link de senha nova e definir a senha pelo link do e-mail. */
const PUBLIC_PATHS: readonly string[] = [SIGN_IN_PATH, '/esqueci-a-senha', '/definir-senha']

/** Para onde mandar quem abriu `path` com esta sessão; `null` = pode ficar. */
export function redirectFor(session: AdminSession, path: string): string | null {
  const isPublic = PUBLIC_PATHS.includes(path)
  if (session === null) return isPublic ? null : SIGN_IN_PATH
  if ('next' in session) return path === MFA_PATH || path === '/definir-senha' ? null : MFA_PATH
  return path === MFA_PATH || (isPublic && path !== '/definir-senha') ? HOME_PATH : null
}
