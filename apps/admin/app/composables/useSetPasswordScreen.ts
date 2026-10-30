import type { LinkFragment, PasswordForm, SetPasswordScreen } from '../types/views'
import { passwordFormError } from '../utils/passwordForm'

/** Definir a senha pelo link do convite ou da recuperação. Depois a pessoa entra normalmente (senha + autenticador). */
export function useSetPasswordScreen(): SetPasswordScreen {
  const { auth } = useAdminServices()

  const screen: SetPasswordScreen = reactive({
    link: null as LinkFragment | null,
    form: { password: '', confirmation: '' } as PasswordForm,
    submitting: false,
    done: false,
    errorCode: null,
    change(patch: Partial<PasswordForm>): void {
      screen.form = { ...screen.form, ...patch }
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
      const result = await auth.setPassword({ accessToken: link.accessToken, refreshToken: link.refreshToken, password: screen.form.password })
      screen.submitting = false
      if (result.ok) screen.done = true
      else screen.errorCode = result.error.code
    },
  })

  onMounted(() => {
    screen.link = useLinkFragment()
  })

  return screen
}
