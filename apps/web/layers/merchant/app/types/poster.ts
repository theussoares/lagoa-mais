import type { QrPath } from '#layers/ui/app/types/qr'

/** Cor do cartaz: sai do nome da loja, então cada loja tem a sua e a mesma loja imprime sempre igual. */
export type PosterTheme = 'deep' | 'lake' | 'leaf'

/** Tamanho do nome da loja no cartaz: nome longo encolhe para não quebrar em quatro linhas. */
export type PosterNameScale = 'large' | 'medium' | 'small'

/** Cartaz do balcão, texto pronto em pt-BR. */
export interface CheckInPosterModel {
  readonly brand: string
  readonly shopName: string
  readonly theme: PosterTheme
  readonly nameScale: PosterNameScale
  readonly eyebrow: string
  /** "Junte 10 carimbos e ganhe". */
  readonly goal: string
  /** "Corte grátis", em destaque logo abaixo de `goal`. */
  readonly rewardTitle: string
  /** Casas do cartão desenhadas no cartaz (a última é o prêmio); 0 quando o programa é em pontos. */
  readonly stampSlots: number
  readonly steps: readonly string[]
  readonly qr: QrPath
  /** Texto alternativo do QR: diz o que ele faz, não o link. */
  readonly qrLabel: string
  readonly codeLabel: string
  readonly code: string
}

/** Retorno de `usePosterScreen`. */
export interface PosterScreen {
  readonly status: 'loading' | 'error' | 'ready'
  readonly poster: CheckInPosterModel | null
  readonly print: () => void
  readonly download: () => Promise<void>
  readonly reload: () => Promise<void>
}
