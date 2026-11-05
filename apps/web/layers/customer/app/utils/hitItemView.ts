import type { ShowcaseEarning } from '#shared/domain/showcaseEarning'
import type { HitsBanner, PublicHitItem } from '#shared/schemas/showcase'
import type { Translate } from '#layers/core/app/types/i18n'
import { toHitPriceModel, toHitTagModels } from '#layers/core/app/utils/hitPrice'
import type { HitItemCardModel, HitItemEarningModel, HitsBannerModel } from '../types/hits'
import { shopContactLink } from './shopContact'

/** Selo do "rende": a frase por unidade e o aviso do dia surpresa. `null` = sem selo. */
export function hitItemEarning(earning: ShowcaseEarning, t: Translate): HitItemEarningModel | null {
  if (earning === null) return null
  return {
    label: t(`hits.earn.${earning.unit}`, { n: earning.units }, earning.units),
    doubled: earning.doubled ? t('hits.earn.doubled') : null,
  }
}

export function toHitItemCardModel(item: PublicHitItem, t: Translate): HitItemCardModel {
  return {
    id: item.id,
    title: item.title,
    shopName: item.shop.name,
    photoUrl: item.photoUrl,
    price: toHitPriceModel(item, t),
    tags: toHitTagModels(item.tags, t),
    earning: hitItemEarning(item.earning, t),
    contact: item.contact === null ? null : shopContactLink({ name: item.shop.name, contact: item.contact }, t),
  }
}

/** Todo banner leva um selo: pago é "Patrocinado"; o do Pro, "Destaque". */
export function toHitsBannerModel(banner: HitsBanner, t: Translate): HitsBannerModel {
  return {
    id: banner.item.id,
    title: banner.item.title,
    shopName: banner.item.shop.name,
    photoUrl: banner.item.photoUrl,
    seal: t(banner.sponsored ? 'hits.sponsored' : 'hits.featured'),
  }
}
