import { ADMIN_PASSWORD_MIN_LENGTH } from '#shared/constants/domain'
import type { AdminSetPassword } from '#shared/schemas/admin'
import type { LinkFragment, PasswordForm } from '../types/views'

/** Senha nova digitada duas vezes: o que falta antes de mandar ao servidor (que confere de novo). */
export function passwordFormError(form: PasswordForm): 'passwordTooShort' | 'passwordMismatch' | null {
  if (form.password.length < ADMIN_PASSWORD_MIN_LENGTH) return 'passwordTooShort'
  return form.password === form.confirmation ? null : 'passwordMismatch'
}

/** Pedido de definir a senha pelo link; o código do autenticador só vai depois que o servidor pediu (`mfaCodeRequired`). */
export function setPasswordRequest(link: Extract<LinkFragment, { status: 'ok' }>, password: string, code: string): AdminSetPassword {
  return { accessToken: link.accessToken, refreshToken: link.refreshToken, password, ...(code === '' ? {} : { code }) }
}

/** Só dígitos, no tamanho do código do autenticador. */
export function mfaCodeInput(raw: string, length: number): string {
  return raw.replace(/\D/g, '').slice(0, length)
}
