import { z } from 'zod'
import { HIT_ITEM_TAGS_MAX } from '../constants/domain'

/**
 * Lista fechada para a rede poder moderar. `clubOnly` é só um selo ("Só para clientes do clube"): o servidor não
 * restringe quem vê o produto. Texto pt-BR: chave `hits.tags.<tag>` (a ordem daqui é a do card).
 */
export const HIT_TAGS = ['clubOnly', 'new', 'lastUnits'] as const

export const HitTagSchema = z.enum(HIT_TAGS)
export type HitTag = z.infer<typeof HitTagSchema>

export const HitTagsSchema = z
  .array(HitTagSchema)
  .max(HIT_ITEM_TAGS_MAX)
  .refine((tags) => new Set(tags).size === tags.length, { message: 'duplicateTag' })

/** Lê o que o banco guarda; valor que o domínio não conhece (tag aposentada) é descartado, nunca erro na tela. */
export function parseHitTags(stored: readonly string[]): HitTag[] {
  const known = stored.flatMap((value) => {
    const parsed = HitTagSchema.safeParse(value)
    return parsed.success ? [parsed.data] : []
  })
  return HIT_TAGS.filter((tag) => known.includes(tag))
}
