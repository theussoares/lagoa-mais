import { describe, expect, it } from 'vitest'
import { PhoneNumberSchema } from '#shared/schemas/phone'
import { createTestPii } from '../../test-support/pii'
import { DemoMerchant } from './demo-merchant'

// Números de teste inventados, não são de ninguém.
const DEMO_PHONE = PhoneNumberSchema.parse('67911110000')
const OTHER_PHONE = PhoneNumberSchema.parse('67922220000')

describe('DemoMerchant', () => {
  it('makes nobody the demo merchant without DEMO_MERCHANT_PHONE', () => {
    const pii = createTestPii()
    const demo = new DemoMerchant({ DEMO_MERCHANT_PHONE: undefined }, pii)
    expect(demo.owns(pii.hashPhone(DEMO_PHONE))).toBe(false)
  })

  it('recognises the hash of the demo phone from the same PiiService, and only it', () => {
    const pii = createTestPii()
    const demo = new DemoMerchant({ DEMO_MERCHANT_PHONE: DEMO_PHONE }, pii)
    expect(demo.owns(pii.hashPhone(DEMO_PHONE))).toBe(true)
    expect(demo.owns(pii.hashPhone(OTHER_PHONE))).toBe(false)
  })

  it('does not keep the phone in the clear', () => {
    const demo = new DemoMerchant({ DEMO_MERCHANT_PHONE: DEMO_PHONE }, createTestPii())
    expect(JSON.stringify(demo)).not.toContain(DEMO_PHONE)
    for (const value of Object.values(demo)) {
      expect(String(value)).not.toContain(DEMO_PHONE)
      if (Buffer.isBuffer(value)) expect(value.toString('utf8')).not.toContain(DEMO_PHONE)
    }
  })
})
