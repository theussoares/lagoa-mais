import type { PosterNameScale, PosterTheme } from '../types/poster'

/** Classes por tema, literais para o Tailwind achar; só tokens do design system (MASTER > Cor). */
export const POSTER_THEME_CLASSES: Record<PosterTheme, { band: string; accent: string; step: string }> = {
  deep: { band: 'bg-tinta-900', accent: 'border-tinta-900 text-tinta-900', step: 'bg-tinta-900' },
  lake: { band: 'bg-tinta-700', accent: 'border-tinta-700 text-tinta-700', step: 'bg-tinta-700' },
  leaf: { band: 'bg-folha-800', accent: 'border-folha-800 text-folha-800', step: 'bg-folha-800' },
}

export const POSTER_NAME_CLASSES: Record<PosterNameScale, string> = {
  large: 'text-[9.5cqw]',
  medium: 'text-[7.4cqw]',
  small: 'text-[5.8cqw]',
}
