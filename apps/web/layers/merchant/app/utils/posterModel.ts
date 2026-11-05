import type { ShopPoster } from '#shared/schemas/shop'
import { checkInLink } from '#shared/utils/checkInCode'
import type { Translate } from '#layers/core/app/types/i18n'
import type { CheckInPosterModel, PosterNameScale, PosterTheme } from '../types/poster'
import { qrPath } from '#layers/ui/app/utils/qrPath'
import { unitsText } from '#layers/core/app/utils/units'

const THEMES: readonly PosterTheme[] = ['deep', 'lake', 'leaf']
const MAX_STAMP_SLOTS = 10
const LARGE_NAME_MAX_LENGTH = 14
const MEDIUM_NAME_MAX_LENGTH = 26

/** Mesma loja, mesma cor: a soma dos caracteres escolhe uma das cores do tema. */
export function posterTheme(shopName: string): PosterTheme {
  const sum = [...shopName.trim().toLowerCase()].reduce((total, char) => total + (char.codePointAt(0) ?? 0), 0)
  return THEMES[sum % THEMES.length] ?? 'deep'
}

export function posterNameScale(shopName: string): PosterNameScale {
  const length = shopName.trim().length
  if (length <= LARGE_NAME_MAX_LENGTH) return 'large'
  return length <= MEDIUM_NAME_MAX_LENGTH ? 'medium' : 'small'
}

/** Cartão de carimbos vira uma fileira de casas (a última é o prêmio). Em pontos, ou com nome muito longo (a folha não tem espaço), não se desenha. */
function stampSlotsOf(poster: ShopPoster): number {
  if (poster.unit !== 'stamp' || posterNameScale(poster.shopName) === 'small') return 0
  return Math.min(poster.target, MAX_STAMP_SLOTS)
}

/** O QR leva ao check-in neste mesmo endereço do app; o código embaixo serve para quem prefere digitar. */
export function toCheckInPosterModel(poster: ShopPoster, origin: string, t: Translate): CheckInPosterModel {
  return {
    brand: t('app.name'),
    shopName: poster.shopName,
    theme: posterTheme(poster.shopName),
    nameScale: posterNameScale(poster.shopName),
    eyebrow: t('poster.eyebrow'),
    goal: t('poster.goal', { units: unitsText(t, poster.unit, poster.target) }),
    rewardTitle: poster.rewardTitle,
    stampSlots: stampSlotsOf(poster),
    steps: [t('poster.steps.scan'), t('poster.steps.join'), t('poster.steps.earn')],
    qr: qrPath(checkInLink(origin, poster.checkInCode)),
    qrLabel: t('poster.qrLabel', { shop: poster.shopName }),
    codeLabel: t('poster.codeLabel'),
    code: poster.checkInCode,
  }
}
