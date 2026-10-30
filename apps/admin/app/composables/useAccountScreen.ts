import { ADMIN_MFA_CODE_LENGTH } from '#shared/constants/domain'
import type { AdminMfaEnrollment } from '#shared/schemas/admin'
import type { AccountScreen, PasswordForm } from '../types/views'
import { passwordFormError } from '../utils/passwordForm'

/** Minha conta: trocar a senha e trocar de autenticador (o novo só vale depois de confirmado; aí o antigo sai). */
export function useAccountScreen(): AccountScreen {
  const { auth } = useAdminServices()
  const session = useAdminSessionState()

  const screen: AccountScreen = reactive({
    get name(): string {
      return session.value && 'admin' in session.value ? session.value.admin.name : ''
    },
    password: { password: '', confirmation: '' } as PasswordForm,
    passwordSaving: false,
    passwordMessage: null,
    enrollment: null as AdminMfaEnrollment | null,
    mfaCode: '',
    mfaBusy: false,
    mfaMessage: null,
    changePassword(patch: Partial<PasswordForm>): void {
      screen.password = { ...screen.password, ...patch }
      screen.passwordMessage = null
    },
    async savePassword(): Promise<void> {
      const invalid = passwordFormError(screen.password)
      if (invalid !== null) {
        screen.passwordMessage = { tone: 'error', key: `auth.errors.${invalid}` }
        return
      }
      screen.passwordSaving = true
      const result = await auth.changePassword(screen.password.password)
      screen.passwordSaving = false
      screen.passwordMessage = result.ok ? { tone: 'success', key: 'account.password.saved' } : { tone: 'error', key: `auth.errors.${result.error.code}` }
      if (result.ok) screen.password = { password: '', confirmation: '' }
    },
    async startMfa(): Promise<void> {
      screen.mfaBusy = true
      const result = await auth.enrollMfa()
      screen.mfaBusy = false
      if (result.ok) screen.enrollment = result.value
      else screen.mfaMessage = { tone: 'error', key: `auth.errors.${result.error.code}` }
    },
    setMfaCode(code: string): void {
      screen.mfaCode = code.replace(/\D/g, '').slice(0, ADMIN_MFA_CODE_LENGTH)
    },
    async confirmMfa(): Promise<void> {
      screen.mfaBusy = true
      const result = await auth.verifyMfa(screen.mfaCode)
      screen.mfaBusy = false
      screen.mfaCode = ''
      if (!result.ok) {
        screen.mfaMessage = { tone: 'error', key: `auth.errors.${result.error.code}` }
        return
      }
      screen.enrollment = null
      screen.mfaMessage = { tone: 'success', key: 'account.mfa.replaced' }
    },
    cancelMfa(): void {
      screen.enrollment = null
      screen.mfaCode = ''
    },
  })
  return screen
}
