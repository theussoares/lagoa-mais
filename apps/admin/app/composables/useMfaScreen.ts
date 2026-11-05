import { ADMIN_MFA_CODE_LENGTH } from '#shared/constants/domain'
import type { AdminMfaEnrollment } from '#shared/schemas/admin'
import type { MfaScreen } from '../types/views'
import { HOME_PATH } from '../utils/sessionRoute'

/** Segundo passo: no primeiro acesso, mostra o QR para cadastrar o autenticador; depois, só o código de 6 dígitos. */
export function useMfaScreen(): MfaScreen {
  const { auth } = useAdminServices()
  const session = useAdminSession()
  const state = session.state.value
  const step = state !== null && state !== undefined && 'next' in state ? state.next : 'verify'

  const screen: MfaScreen = reactive({
    step,
    enrollment: null as AdminMfaEnrollment | null,
    code: '',
    submitting: false,
    loading: step === 'enroll',
    errorCode: null,
    setCode(code: string): void {
      screen.code = code.replace(/\D/g, '').slice(0, ADMIN_MFA_CODE_LENGTH)
      screen.errorCode = null
    },
    async submit(): Promise<void> {
      if (screen.code.length !== ADMIN_MFA_CODE_LENGTH) {
        screen.errorCode = 'invalidMfaCode'
        return
      }
      screen.submitting = true
      const result = await auth.verifyMfa(screen.code)
      screen.submitting = false
      if (!result.ok) {
        screen.errorCode = result.error.code
        screen.code = ''
        return
      }
      await session.refresh()
      await navigateTo(HOME_PATH)
    },
    signOut: () => session.signOut(),
  })

  onMounted(async () => {
    if (step !== 'enroll') return
    const result = await auth.enrollMfa()
    screen.loading = false
    if (result.ok) screen.enrollment = result.value
    else screen.errorCode = result.error.code
  })

  return screen
}
