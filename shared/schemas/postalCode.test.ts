import { describe, expect, it } from 'vitest'
import { PostalCodeAddressSchema, PostalCodeSchema } from './postalCode'

describe('PostalCodeSchema', () => {
  it('takes exactly eight digits', () => {
    expect(PostalCodeSchema.safeParse('79601000').success).toBe(true)
    for (const bad of ['7960100', '796010000', '79601-000', '7960100a', '', undefined]) expect(PostalCodeSchema.safeParse(bad).success).toBe(false)
  })
})

describe('PostalCodeAddressSchema', () => {
  it('needs a non-empty line within the shop address limit', () => {
    expect(PostalCodeAddressSchema.safeParse({ addressLine: 'Rua X' }).success).toBe(true)
    expect(PostalCodeAddressSchema.safeParse({ addressLine: '' }).success).toBe(false)
    expect(PostalCodeAddressSchema.safeParse({ addressLine: 'a'.repeat(101) }).success).toBe(false)
  })
})
