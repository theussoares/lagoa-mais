import { redirectFor } from '../utils/sessionRoute'

/** Toda página: sem sessão vai para Entrar; no meio do MFA, para o autenticador; com sessão, fora das telas de entrada. */
export default defineNuxtRouteMiddleware(async (to) => {
  const session = useAdminSession()
  await session.ensure()
  const target = redirectFor(session.state.value ?? null, to.path)
  if (target !== null && target !== to.path) return navigateTo(target)
})
