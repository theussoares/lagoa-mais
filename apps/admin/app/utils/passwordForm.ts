import { ADMIN_PASSWORD_MIN_LENGTH } from '#shared/constants/domain'
import type { PasswordForm } from '../types/views'

/** Senha nova digitada duas vezes: o que falta antes de mandar ao servidor (que confere de novo). */
export function passwordFormError(form: PasswordForm): 'passwordTooShort' | 'passwordMismatch' | null {
  if (form.password.length < ADMIN_PASSWORD_MIN_LENGTH) return 'passwordTooShort'
  return form.password === form.confirmation ? null : 'passwordMismatch'
}
