import type { HitTag } from '#shared/domain/hitTag'

/** Preço do produto do Hits já em texto: "Sob consulta" ou o preço, com o "de" riscado e o % quando há promoção. */
export interface HitPriceModel {
  /** O que o cliente paga (o promocional quando há), ou "Sob consulta". */
  readonly price: string
  /** O preço normal, para vir riscado; `null` sem promoção. */
  readonly original: string | null
  /** "-12%"; `null` sem promoção. */
  readonly discount: string | null
}

export interface HitTagModel {
  readonly tag: HitTag
  readonly label: string
}
