import { describe, expect, it, vi } from 'vitest'
import type { AuthOutcome, TokenPair } from '../types/auth'
import { demoAvailability, demoCredentialsFor, demoSurfaceMatchesHost, runDemoLogin, type DemoLoginRequest } from '../utils/demoLogin'

const CONFIG = { customerPhone: '67991110001', merchantPhone: '67991110002', otp: '123456' }
const SPLIT = { customerUrl: 'https://app.lagoa.test', merchantUrl: 'https://balcao.lagoa.test' }
const SAME_HOST = { customerUrl: '', merchantUrl: '' }

describe('demoCredentialsFor', () => {
  it('returns the phone of each surface with the shared code', () => {
    expect(demoCredentialsFor(CONFIG, 'customer')).toEqual({ phone: '67991110001', code: '123456' })
    expect(demoCredentialsFor(CONFIG, 'merchant')).toEqual({ phone: '67991110002', code: '123456' })
  })

  it('is off when any env is empty or malformed', () => {
    expect(demoCredentialsFor({ ...CONFIG, otp: '' }, 'customer')).toBeNull()
    expect(demoCredentialsFor({ ...CONFIG, otp: '12345' }, 'customer')).toBeNull()
    expect(demoCredentialsFor({ ...CONFIG, customerPhone: '' }, 'customer')).toBeNull()
    expect(demoCredentialsFor({ ...CONFIG, merchantPhone: '+5567991110002' }, 'merchant')).toBeNull()
  })

  it('turns off only the surface that is missing its phone', () => {
    const config = { ...CONFIG, merchantPhone: '' }
    expect(demoCredentialsFor(config, 'customer')).not.toBeNull()
    expect(demoCredentialsFor(config, 'merchant')).toBeNull()
  })
})

describe('demoSurfaceMatchesHost', () => {
  it('requires each surface on its own host when hosts are split', () => {
    expect(demoSurfaceMatchesHost('customer', 'app.lagoa.test', SPLIT)).toBe(true)
    expect(demoSurfaceMatchesHost('customer', 'balcao.lagoa.test', SPLIT)).toBe(false)
    expect(demoSurfaceMatchesHost('merchant', 'balcao.lagoa.test', SPLIT)).toBe(true)
    expect(demoSurfaceMatchesHost('merchant', 'app.lagoa.test', SPLIT)).toBe(false)
    expect(demoSurfaceMatchesHost('merchant', undefined, SPLIT)).toBe(false)
  })

  it('accepts any host when the split is off', () => {
    expect(demoSurfaceMatchesHost('customer', 'localhost:3000', SAME_HOST)).toBe(true)
    expect(demoSurfaceMatchesHost('merchant', 'localhost:3000', { customerUrl: SPLIT.customerUrl, merchantUrl: '' })).toBe(true)
  })
})

describe('demoAvailability', () => {
  it('exposes only booleans, filtered by host', () => {
    expect(demoAvailability(CONFIG, 'app.lagoa.test', SPLIT)).toEqual({ customer: true, merchant: false })
    expect(demoAvailability(CONFIG, 'balcao.lagoa.test', SPLIT)).toEqual({ customer: false, merchant: true })
  })

  it('is all off without config', () => {
    expect(demoAvailability({ customerPhone: '', merchantPhone: '', otp: '' }, 'localhost', SAME_HOST)).toEqual({ customer: false, merchant: false })
  })
})

const TOKENS: TokenPair = { accessToken: 'at', refreshToken: 'rt', expiresIn: 3600, userId: 'user-1' }
const REQUEST: DemoLoginRequest = { surface: 'customer', host: 'app.lagoa.test', config: CONFIG, urls: SPLIT }

function ports(overrides: { reserve?: AuthOutcome<true>; verify?: AuthOutcome<TokenPair> } = {}) {
  return {
    reserveAttempt: vi.fn().mockResolvedValue(overrides.reserve ?? { ok: true, value: true }),
    verifyCode: vi.fn().mockResolvedValue(overrides.verify ?? { ok: true, value: TOKENS }),
  }
}

describe('runDemoLogin', () => {
  it('reserves an attempt (per client IP, not per phone), then verifies the fixed code', async () => {
    const p = ports()
    await expect(runDemoLogin(REQUEST, p)).resolves.toEqual({ kind: 'success', tokens: TOKENS })
    expect(p.reserveAttempt).toHaveBeenCalledWith()
    expect(p.verifyCode).toHaveBeenCalledWith('67991110001', '123456')
  })

  it('uses the merchant phone for the merchant surface on its host', async () => {
    const p = ports()
    await runDemoLogin({ ...REQUEST, surface: 'merchant', host: 'balcao.lagoa.test' }, p)
    expect(p.verifyCode).toHaveBeenCalledWith('67991110002', '123456')
  })

  it('is not found, without touching anything, when the envs are off', async () => {
    const p = ports()
    await expect(runDemoLogin({ ...REQUEST, config: { customerPhone: '', merchantPhone: '', otp: '' } }, p)).resolves.toEqual({ kind: 'notFound' })
    expect(p.reserveAttempt).not.toHaveBeenCalled()
    expect(p.verifyCode).not.toHaveBeenCalled()
  })

  it('is not found when the surface does not match the host', async () => {
    const p = ports()
    await expect(runDemoLogin({ ...REQUEST, surface: 'merchant' }, p)).resolves.toEqual({ kind: 'notFound' })
    expect(p.verifyCode).not.toHaveBeenCalled()
  })

  it('stops at the rate limit before verifying', async () => {
    const p = ports({ reserve: { ok: false, code: 'rateLimited' } })
    await expect(runDemoLogin(REQUEST, p)).resolves.toEqual({ kind: 'failure', code: 'rateLimited' })
    expect(p.verifyCode).not.toHaveBeenCalled()
  })

  it('reports the provider refusal without tokens', async () => {
    const p = ports({ verify: { ok: false, code: 'invalidLoginCode' } })
    await expect(runDemoLogin(REQUEST, p)).resolves.toEqual({ kind: 'failure', code: 'invalidLoginCode' })
  })
})
