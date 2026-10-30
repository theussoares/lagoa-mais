import { ApiClient } from '#layers/core/app/services/http/ApiClient'
import type { AdminServices } from '../services/AdminServices'
import { HttpAdminAuthService } from '../services/http/HttpAdminAuthService'
import { createHttpFeaturedService, createHttpHitsService, createHttpShopsService, createHttpTeamService } from '../services/http/HttpAdminServices'
import { SIGN_IN_PATH } from '../utils/sessionRoute'

/** Os services do painel, sobre o BFF do próprio domínio. Um 401 da API derruba a sessão local e volta para Entrar. */
export default defineNuxtPlugin(() => {
  const router = useRouter()
  const session = useAdminSessionState()
  const fetcher: typeof fetch = (input, init) => fetch(input, init)
  const api = new ApiClient({
    baseUrl: '/api/admin',
    fetcher,
    onUnauthorized: () => {
      session.value = null
      void router.replace(SIGN_IN_PATH)
    },
  })
  const services: AdminServices = {
    auth: new HttpAdminAuthService(fetcher),
    shops: createHttpShopsService(api),
    hits: createHttpHitsService(api),
    featured: createHttpFeaturedService(api),
    team: createHttpTeamService(api),
  }
  return { provide: { adminServices: services } }
})
