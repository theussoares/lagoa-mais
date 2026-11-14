export interface ManifestHosts {
  readonly merchantUrl: string
  /** Host do pedido (`x-forwarded-host` ou `host`). */
  readonly host: string | undefined
}

const iconsWith = (suffix: string) => [
  { src: `/pwa-192x192${suffix}.png`, sizes: '192x192', type: 'image/png', purpose: 'any' },
  { src: `/pwa-512x512${suffix}.png`, sizes: '512x512', type: 'image/png', purpose: 'any' },
  { src: `/pwa-maskable-512x512${suffix}.png`, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
]

const CUSTOMER = {
  id: '/carteira',
  name: 'Lagoa+',
  short_name: 'Lagoa+',
  description: 'Seus carimbos e pontos nas lojas de Três Lagoas, numa carteira só.',
  start_url: '/carteira',
  orientation: 'portrait',
  icons: iconsWith(''),
}

const MERCHANT = {
  id: '/balcao',
  name: 'Lagoa+ Balcão',
  short_name: 'Balcão',
  description: 'Lance visitas e acompanhe os clientes da sua loja no Lagoa+.',
  start_url: '/balcao',
  orientation: 'any',
  icons: iconsWith('-balcao'),
}

/** Nome e ícone da tela inicial do iPhone (ele lê o `<head>`, não o manifest). O Balcão tem ícone próprio para não se confundir com o app. */
export const HOME_SCREEN_IDENTITY = {
  merchant: { title: 'Balcão', touchIcon: '/apple-touch-icon-balcao.png' },
  customer: { title: 'Lagoa+', touchIcon: '/apple-touch-icon.png' },
} as const

export function isMerchantHost({ merchantUrl, host }: ManifestHosts): boolean {
  const merchantHost = hostOf(merchantUrl)
  return merchantHost !== null && host === merchantHost
}

function hostOf(origin: string): string | null {
  try {
    return new URL(origin).host
  } catch {
    return null
  }
}

/**
 * Um manifest só por deploy fazia o PWA instalado no Balcão abrir `/carteira`, que o `surface-host` manda para o app
 * do cliente. O manifest sai por host: no do Balcão o app instalado começa e se identifica como Balcão.
 */
export function buildWebManifest({ merchantUrl, host }: ManifestHosts) {
  const surface = isMerchantHost({ merchantUrl, host }) ? MERCHANT : CUSTOMER
  return {
    ...surface,
    lang: 'pt-BR',
    scope: '/',
    display: 'standalone',
    background_color: '#01348D',
    theme_color: '#01348D',
  }
}
