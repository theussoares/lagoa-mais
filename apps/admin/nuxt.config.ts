// Painel da rede (aprovar lojas, produtos do Hits e destaques). App próprio, deploy e domínio próprios
// (admin.lagoamais.com.br): o cookie do admin nunca é o do app nem o do Balcão.
import { fileURLToPath } from 'node:url'
import { ADMIN_SECURITY_HEADERS } from './server/utils/adminSecurityHeaders'

export default defineNuxtConfig({
  extends: ['../web/layers/ui'],
  alias: {
    '#shared': fileURLToPath(new URL('../../shared', import.meta.url)),
    '#layers/ui': fileURLToPath(new URL('../web/layers/ui', import.meta.url)),
    // Só as peças puras do core do app (cliente HTTP, `parseDomainError`): a layer em si não é herdada.
    '#layers/core': fileURLToPath(new URL('../web/layers/core', import.meta.url)),
  },
  compatibilityDate: '2026-10-01',
  // Só desktop, nada a indexar e nada a renderizar com dado: SPA, a sessão é conferida pelo BFF.
  ssr: false,
  modules: ['@nuxtjs/i18n'],
  i18n: {
    defaultLocale: 'pt-BR',
    strategy: 'no_prefix',
    locales: [{ code: 'pt-BR', language: 'pt-BR', name: 'Português', file: 'pt-BR.json' }],
    detectBrowserLanguage: false,
  },
  colorMode: { preference: 'light', fallback: 'light' },
  routeRules: { '/**': { headers: ADMIN_SECURITY_HEADERS } },
  runtimeConfig: {
    /** Base da API (`/v1` incluso). Env: NUXT_API_BASE_URL. */
    apiBaseUrl: '',
    /** URL do projeto Supabase (login por senha e MFA, só no servidor). Env: NUXT_SUPABASE_URL. */
    supabaseUrl: '',
    /** Chave pública do Supabase. Env: NUXT_SUPABASE_ANON_KEY. */
    supabaseAnonKey: '',
    /** Segredo do Cloudflare Turnstile (siteverify). Env: NUXT_TURNSTILE_SECRET. */
    turnstileSecret: '',
    /** Mesmo BFF_SHARED_SECRET da API (reserva de tentativa de login). Env: NUXT_BFF_SHARED_SECRET. */
    bffSharedSecret: '',
    /** Endereço público do painel (https://admin.lagoamais.com.br): destino do link de "esqueci a senha". Vazio = o host do pedido. Env: NUXT_APP_URL. */
    appUrl: '',
    /** Origens extras que podem escrever em `/api/**`. Env: NUXT_ALLOWED_ORIGINS. */
    allowedOrigins: '',
    public: {
      /** Chave pública do widget do Turnstile. Env: NUXT_PUBLIC_TURNSTILE_SITE_KEY. */
      turnstileSiteKey: '',
    },
  },
  app: {
    head: {
      htmlAttrs: { lang: 'pt-BR' },
      title: 'Lagoa+ Rede',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'robots', content: 'noindex, nofollow' },
      ],
      link: [{ rel: 'icon', href: '/favicon.ico', sizes: 'any' }],
    },
  },
  typescript: { strict: true },
})
