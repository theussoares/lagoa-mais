import type { AdminSessionControls } from '../types/session'
import { SIGN_IN_PATH } from '../utils/sessionRoute'

/** Pergunta a sessão ao BFF (uma vez por carga, ou de novo depois de entrar) e sai pelo servidor. */
export function useAdminSession(): AdminSessionControls {
  const state = useAdminSessionState()
  const { auth } = useAdminServices()

  async function refresh(): Promise<void> {
    const result = await auth.session()
    state.value = result.ok ? result.value : null
  }

  async function ensure(): Promise<void> {
    if (state.value === undefined) await refresh()
  }

  async function signOut(): Promise<void> {
    await auth.signOut()
    state.value = null
    await navigateTo(SIGN_IN_PATH)
  }

  return { state, refresh, ensure, signOut }
}
