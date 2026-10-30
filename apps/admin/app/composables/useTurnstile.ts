import type { Ref } from 'vue'
import type { TurnstileControls } from '../types/views'

const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
/** Sem chave do widget (desenvolvimento), o BFF também não confere: vai um marcador no lugar do token. */
const DEV_TOKEN = 'turnstile-disabled'

interface TurnstileApi {
  render(element: HTMLElement, options: { sitekey: string; callback: (token: string) => void; 'expired-callback': () => void; language: string }): string
  reset(widgetId: string): void
}

let scriptLoading: Promise<TurnstileApi | null> | null = null

function loadScript(): Promise<TurnstileApi | null> {
  scriptLoading ??= new Promise((resolve) => {
    const script = document.createElement('script')
    script.src = SCRIPT_URL
    script.async = true
    script.onload = () => resolve(Reflect.get(window, 'turnstile') ?? null)
    script.onerror = () => resolve(null)
    document.head.append(script)
  })
  return scriptLoading
}

/** Captcha do Cloudflare no elemento dado. O token vale uma vez: depois de cada tentativa, `reset()`. */
export function useTurnstile(container: Ref<HTMLElement | null>): TurnstileControls {
  const siteKey = useRuntimeConfig().public.turnstileSiteKey
  const token = ref(siteKey === '' ? DEV_TOKEN : '')
  let widgetId: string | null = null
  let api: TurnstileApi | null = null

  onMounted(async () => {
    if (siteKey === '' || container.value === null) return
    api = await loadScript()
    if (api === null || container.value === null) return
    widgetId = api.render(container.value, {
      sitekey: siteKey,
      language: 'pt-br',
      callback: (value) => (token.value = value),
      'expired-callback': () => (token.value = ''),
    })
  })

  function reset(): void {
    if (api === null || widgetId === null) return
    token.value = ''
    api.reset(widgetId)
  }

  return { token, enabled: siteKey !== '', reset }
}
