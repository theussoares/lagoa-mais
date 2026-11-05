import type { AdminHitItem } from '#shared/schemas/admin'
import { formatCurrency } from '#shared/utils/currency'
import { formatShortDate } from '#shared/utils/dateFormat'
import { shopContactHref } from '#shared/utils/shopContactHref'
import type { HitCard } from '../types/views'

/** O card da moderação: o link do botão sai por inteiro, para o admin ver para onde o cliente vai. */
export function toHitCard(item: AdminHitItem): HitCard {
  return {
    id: item.id,
    title: item.title,
    description: item.description,
    photoUrl: item.photoUrl,
    priceLabel: item.priceCents === null ? null : formatCurrency(item.priceCents),
    endsLabel: item.endsAt === null ? null : formatShortDate(item.endsAt),
    shopName: item.shop.name,
    shopStatus: item.shop.status,
    contactHref: item.contact === null ? null : shopContactHref(item.contact),
    contactLabel: item.contact?.ctaLabel ?? null,
    contactKind: item.contact?.kind ?? null,
    contactSource: item.contactSource,
    createdLabel: formatShortDate(item.createdAt),
  }
}
