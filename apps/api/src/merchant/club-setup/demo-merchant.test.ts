import { Logger } from '@nestjs/common'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PhoneNumberSchema } from '#shared/schemas/phone'
import { createTestPii } from '../../test-support/pii'
import { DemoMerchant } from './demo-merchant'

// Números de teste inventados, não são de ninguém.
const DEMO_PHONE = PhoneNumberSchema.parse('67911110000')
const OTHER_PHONE = PhoneNumberSchema.parse('67922220000')

describe('DemoMerchant', () => {
  it('makes nobody the demo merchant without DEMO_MERCHANT_PHONE', () => {
    const pii = createTestPii()
    const demo = new DemoMerchant({ DEMO_MERCHANT_PHONE: undefined, NODE_ENV: 'test' }, pii)
    expect(demo.owns(pii.hashPhone(DEMO_PHONE))).toBe(false)
  })

  it('recognises the hash of the demo phone from the same PiiService, and only it', () => {
    const pii = createTestPii()
    const demo = new DemoMerchant({ DEMO_MERCHANT_PHONE: DEMO_PHONE, NODE_ENV: 'test' }, pii)
    expect(demo.owns(pii.hashPhone(DEMO_PHONE))).toBe(true)
    expect(demo.owns(pii.hashPhone(OTHER_PHONE))).toBe(false)
  })

  it('does not keep the phone in the clear', () => {
    const demo = new DemoMerchant({ DEMO_MERCHANT_PHONE: DEMO_PHONE, NODE_ENV: 'test' }, createTestPii())
    expect(JSON.stringify(demo)).not.toContain(DEMO_PHONE)
    for (const value of Object.values(demo)) {
      expect(String(value)).not.toContain(DEMO_PHONE)
      if (Buffer.isBuffer(value)) expect(value.toString('utf8')).not.toContain(DEMO_PHONE)
    }
  })

  describe('boot notice', () => {
    afterEach(() => {
      vi.restoreAllMocks()
    })

    const bootLines = (env: { DEMO_MERCHANT_PHONE: typeof DEMO_PHONE | undefined; NODE_ENV: 'development' | 'test' | 'production' }) => {
      const pii = createTestPii()
      const log = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined)
      const warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined)
      new DemoMerchant(env, pii).onModuleInit()
      const lines = [...log.mock.calls, ...warn.mock.calls].map((call) => String(call[0]))
      return { log: log.mock.calls.length, warn: warn.mock.calls.length, lines, hash: pii.hashPhone(DEMO_PHONE).toString('hex') }
    }

    it('logs one line saying on, never the phone nor its hash', () => {
      const boot = bootLines({ DEMO_MERCHANT_PHONE: DEMO_PHONE, NODE_ENV: 'production' })
      expect(boot).toMatchObject({ log: 1, warn: 0, lines: ['demo merchant marking: on'] })
      for (const line of boot.lines) {
        expect(line).not.toContain(DEMO_PHONE)
        expect(line).not.toContain(boot.hash)
      }
    })

    it('warns once when production boots without DEMO_MERCHANT_PHONE, and does not throw', () => {
      expect(bootLines({ DEMO_MERCHANT_PHONE: undefined, NODE_ENV: 'production' })).toMatchObject({ log: 0, warn: 1 })
    })

    it('only logs off outside production', () => {
      expect(bootLines({ DEMO_MERCHANT_PHONE: undefined, NODE_ENV: 'development' })).toMatchObject({ log: 1, warn: 0, lines: ['demo merchant marking: off'] })
    })
  })
})
