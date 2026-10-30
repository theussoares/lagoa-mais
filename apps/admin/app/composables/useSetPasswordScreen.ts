import type { LinkFragment, PasswordForm, SetPasswordScreen } from '../types/views'
import { ADMIN_MFA_CODE_LENGTH } from '#shared/constants/domain'
import { mfaCodeInput, passwordFormError, setPasswordRequest } from '../utils/passwordForm'

/** Definir a senha pelo link do convite ou da recuperação (com o código do autenticador, se a conta tem um). Depois a pessoa entra normalmente (senha + autenticador). */
export function useSetPasswordScreen(): SetPasswordScreen {
  const { auth } = useAdminServices()

  const screen: SetPasswordScreen = reactive({
    link: null as LinkFragment | null,
    form: { password: '', confirmation: '' } as PasswordForm,
    submitting: false,
    done: false,
    needsCode: false,
    code: '',
    errorCode: null,
    change(patch: Partial<PasswordForm>): void {
      screen.form = { ...screen.form, ...patch }
      screen.errorCode = null
    },
    setCode(code: string): void {
      screen.code = mfaCodeInput(code, ADMIN_MFA_CODE_LENGTH)
      screen.errorCode = null
    },
    async submit(): Promise<void> {
      const link = screen.link
      if (link === null || link.status !== 'ok') return
      const invalid = passwordFormError(screen.form)
      if (invalid !== null) {
        screen.errorCode = invalid
        return
      }
      screen.submitting = true
      const result = await auth.setPassword(setPasswordRequest(link, screen.form.password, screen.code))
      screen.submitting = false
      if (result.ok) {
        screen.done = true
        return
      }
      // Conta com autenticador: o mesmo formulário passa a pedir o código, e o erro só aparece se ele já foi digitado.
      if (result.error.code === 'mfaCodeRequired') screen.needsCode = true
      screen.errorCode = result.error.code === 'mfaCodeRequired' ? null : result.error.code
      screen.code = ''
    },
  })

  onMounted(() => {
    screen.link = useLinkFragment()
  })

  return screen
}
