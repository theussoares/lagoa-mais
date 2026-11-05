import type { SignInForm, SignInScreen } from '../types/views'
import { MFA_PATH } from '../utils/sessionRoute'

/** Entrar: e-mail, senha e captcha. Depois vem sempre o autenticador (cadastrar ou digitar o código). */
export function useSignInScreen(): SignInScreen {
  const { auth } = useAdminServices()
  const session = useAdminSessionState()

  const screen: SignInScreen = reactive({
    form: { email: '', password: '' } as SignInForm,
    captchaToken: '',
    captchaResetKey: 0,
    submitting: false,
    errorCode: null,
    change(patch: Partial<SignInForm>): void {
      screen.form = { ...screen.form, ...patch }
      screen.errorCode = null
    },
    setCaptcha(token: string): void {
      screen.captchaToken = token
    },
    async submit(): Promise<void> {
      if (screen.form.email.trim() === '' || screen.form.password === '') {
        screen.errorCode = 'invalidCredentials'
        return
      }
      if (screen.captchaToken === '') {
        screen.errorCode = 'captchaFailed'
        return
      }
      screen.submitting = true
      const result = await auth.signIn({ email: screen.form.email, password: screen.form.password, captchaToken: screen.captchaToken })
      screen.submitting = false
      // O token do captcha vale uma vez, deu certo ou não.
      screen.captchaResetKey += 1
      if (!result.ok) {
        screen.errorCode = result.error.code
        screen.form = { ...screen.form, password: '' }
        return
      }
      session.value = { next: result.value }
      await navigateTo(MFA_PATH)
    },
  })
  return screen
}
