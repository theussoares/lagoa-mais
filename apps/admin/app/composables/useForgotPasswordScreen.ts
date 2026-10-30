import type { ForgotPasswordScreen } from '../types/views'

/** "Esqueci a senha": a resposta é sempre "se o e-mail for de alguém da rede, o link chegou". */
export function useForgotPasswordScreen(): ForgotPasswordScreen {
  const { auth } = useAdminServices()

  const screen: ForgotPasswordScreen = reactive({
    email: '',
    captchaToken: '',
    captchaResetKey: 0,
    submitting: false,
    sent: false,
    errorCode: null,
    setEmail(email: string): void {
      screen.email = email
      screen.errorCode = null
    },
    setCaptcha(token: string): void {
      screen.captchaToken = token
    },
    async submit(): Promise<void> {
      if (screen.captchaToken === '') {
        screen.errorCode = 'captchaFailed'
        return
      }
      screen.submitting = true
      const result = await auth.requestPasswordReset({ email: screen.email, captchaToken: screen.captchaToken })
      screen.submitting = false
      screen.captchaResetKey += 1
      if (result.ok) screen.sent = true
      else screen.errorCode = result.error.code
    },
  })
  return screen
}
