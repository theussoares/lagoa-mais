import type { H3Event } from 'h3'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({
  method: 'POST',
  origin: undefined as string | undefined,
  body: undefined as unknown,
  host: 'app.lagoa.test',
  demo: { customerPhone: '67991110001', merchantPhone: '67991110002', otp: '123456' },
  reserve: vi.fn(),
  verify: vi.fn(),
  start: vi.fn(),
  log: vi.fn(),
}))

vi.mock('h3', () => ({
  readBody: async () => state.body,
  getRequestHeader: (_event: unknown, name: string) => {
    if (name === 'origin') return state.origin
    return name === 'host' || name === 'x-forwarded-host' ? state.host : undefined
  },
  getRequestURL: () => new URL('https://app.lagoa.test/api/auth/demo'),
  getRequestIP: () => '203.0.113.9',
  setResponseStatus: () => undefined,
  createError: (input: { statusCode: number }) => Object.assign(new Error('http error'), input),
}))
vi.mock('../utils/loginAttempts', () => ({ reserveDemoLoginAttempt: state.reserve }))
vi.mock('../utils/securityLog', () => ({ logSecurityEvent: state.log }))
vi.mock('../utils/sessionAccess', () => ({ startSession: state.start }))
vi.mock('../utils/serverConfig', () => ({
  readBffConfig: () => ({ apiBaseUrl: 'https://api.test/v1', bffSharedSecret: 's3cret', allowedOrigins: [], secureCookies: true }),
  readDemoConfig: () => state.demo,
  createPhoneLogin: () => ({ verifyCode: state.verify }),
}))

vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
vi.stubGlobal('useRuntimeConfig', () => ({ public: { customerUrl: 'https://app.lagoa.test', merchantUrl: 'https://balcao.lagoa.test' } }))

const TOKENS = { accessToken: 'at', refreshToken: 'rt', expiresIn: 3600, userId: 'user-1' }
const event = { get method() { return state.method } } as unknown as H3Event
type Handler = (e: H3Event) => Promise<unknown> | unknown

/** Como o Nitro: o middleware `origin-guard` roda antes do handler da rota. */
async function request(): Promise<unknown> {
  const guard = ((await import('../middleware/origin-guard')) as unknown as { default: Handler }).default
  const route = ((await import('../api/auth/demo.post')) as unknown as { default: Handler }).default
  await guard(event)
  return route(event)
}

beforeEach(() => {
  state.method = 'POST'
  state.origin = 'https://app.lagoa.test'
  state.body = { surface: 'customer' }
  state.host = 'app.lagoa.test'
  state.demo = { customerPhone: '67991110001', merchantPhone: '67991110002', otp: '123456' }
  state.reserve.mockReset().mockResolvedValue({ ok: true, value: true })
  state.verify.mockReset().mockResolvedValue({ ok: true, value: TOKENS })
  state.start.mockReset()
  state.log.mockReset()
})

describe('POST /api/auth/demo', () => {
  it('opens the session and answers without the phone or the code', async () => {
    const response = await request()
    expect(response).toEqual({ ok: true })
    expect(JSON.stringify(response)).not.toMatch(/6799111|123456/)
    expect(state.verify).toHaveBeenCalledWith('67991110001', '123456')
    expect(state.start).toHaveBeenCalledWith(event, TOKENS, { secure: true })
    expect(JSON.stringify(state.log.mock.calls)).not.toMatch(/6799111|123456/)
  })

  it('does not exist (404) without the envs, and never talks to the API or Supabase', async () => {
    state.demo = { customerPhone: '', merchantPhone: '', otp: '' }
    await expect(request()).rejects.toMatchObject({ statusCode: 404 })
    expect(state.reserve).not.toHaveBeenCalled()
    expect(state.verify).not.toHaveBeenCalled()
  })

  it.each([
    ['no Origin', undefined],
    ['a foreign Origin', 'https://evil.test'],
  ])('refuses %s with 403 before the route runs', async (_name, origin) => {
    state.origin = origin
    await expect(request()).rejects.toMatchObject({ statusCode: 403 })
    expect(state.reserve).not.toHaveBeenCalled()
    expect(state.verify).not.toHaveBeenCalled()
    expect(state.start).not.toHaveBeenCalled()
  })

  it('answers a refusal with only the error code (no phone, no code)', async () => {
    state.reserve.mockResolvedValue({ ok: false, code: 'rateLimited' })
    const response = await request()
    expect(response).toEqual({ code: 'rateLimited' })
    expect(state.start).not.toHaveBeenCalled()
  })
})
