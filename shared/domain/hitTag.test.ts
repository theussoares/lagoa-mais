import { describe, expect, it } from 'vitest'
import { HitTagsSchema, parseHitTags } from './hitTag'

describe('HitTagsSchema', () => {
  it('accepts up to two distinct known tags', () => {
    expect(HitTagsSchema.safeParse([]).success).toBe(true)
    expect(HitTagsSchema.safeParse(['clubOnly', 'new']).success).toBe(true)
  })

  it('refuses unknown, repeated and too many tags', () => {
    expect(HitTagsSchema.safeParse(['vip']).success).toBe(false)
    expect(HitTagsSchema.safeParse(['new', 'new']).success).toBe(false)
    expect(HitTagsSchema.safeParse(['clubOnly', 'new', 'lastUnits']).success).toBe(false)
  })
})

describe('parseHitTags', () => {
  it('drops retired values and keeps the card order', () => {
    expect(parseHitTags(['lastUnits', 'retired', 'clubOnly'])).toEqual(['clubOnly', 'lastUnits'])
  })
})
