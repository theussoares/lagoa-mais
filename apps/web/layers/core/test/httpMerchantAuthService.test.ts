import { describe, expect, it, vi } from 'vitest'
import { PhoneNumberSchema } from '#shared/schemas/phone'
import { LoginCodeSchema } from '#shared/schemas/session'
import type { SignInError } from '#layers/core/app/services/AuthService'
import { HttpMerchantAuthService } from '#layers/core/app/services/HttpMerchantAuthService'
import type { PhoneAuthGateway } from '#layers/core/app/services/PhoneAuthGateway'
import { ApiClient } from '#layers/core/app/services/http/ApiClient'
import type { Result } from '#shared/types/result'

const PHONE = PhoneNumberSchema.parse('67991230374')
const CODE = LoginCodeSchema.parse('123456')
const NOW = new Date('2026-10-01T16:00:00Z')
const SESSION = {
  role: 'merchant',
  merchantId: '0190a000-0000-7000-8000-000000000001',
  shopId: '0190a000-0000-7000-8000-000000000002',
  shopName: 'Barbearia Central',
  shopStatus: 'pending',
  termsAccepted: true,
}

const json = (status: number, body: unknown): Response => new Response(JSON.stringify(body), { status })

function setup(verify: Result<true, SignInError>, routes: Record<string, () => Response>) {
  const gateway: PhoneAuthGateway = {
    sendCode: vi.fn(async () => ({ ok: true as const, value: true as const })),
    verifyCode: vi.fn(async () => verify),
    demoAvailable: vi.fn(async () => true),
    demoSignIn: vi.fn(async () => verify),
    signOut: vi.fn(async () => ({ ok: true as const, value: true as const })),
  }
  const calls: string[] = []
  const fetcher: typeof fetch = async (input, init) => {
    const key = `${init?.method ?? 'GET'} ${String(input).replace('https://api.test/v1', '')}`
    calls.push(key)
    const route = routes[key]
    return route === undefined ? json(500, { code: 'internal' }) : route()
  }
  const api = new ApiClient({ baseUrl: 'https://api.test/v1', fetcher, onUnauthorized: () => {} })
  return { gateway, calls, auth: new HttpMerchantAuthService(gateway, api, () => NOW) }
}

describe('HttpMerchantAuthService', () => {
  it('asks for the code and reports when it expires', async () => {
    const { auth, gateway } = setup({ ok: true, value: true }, {})
    expect(await auth.requestLoginCode(PHONE)).toEqual({ ok: true, value: { expiresAt: '2026-10-01T16:05:00.000Z' } })
    expect(gateway.sendCode).toHaveBeenCalledWith(PHONE)
  })

  it('signs in a merchant that already has a shop, whatever its status', async () => {
    const { auth, calls } = setup({ ok: true, value: true }, { 'GET /merchant/session': () => json(200, SESSION) })
    expect(await auth.signInMerchant(PHONE, CODE)).toEqual({ ok: true, value: { kind: 'session', session: SESSION } })
    expect(calls).toEqual(['GET /merchant/session'])
  })

  it('signs in through the demo account and reads the merchant session, without a code', async () => {
    const { auth, gateway, calls } = setup({ ok: true, value: true }, { 'GET /merchant/session': () => json(200, SESSION) })
    expect(await auth.signInDemoMerchant()).toEqual({ ok: true, value: { kind: 'session', session: SESSION } })
    expect(gateway.demoSignIn).toHaveBeenCalledWith('merchant')
    expect(gateway.verifyCode).not.toHaveBeenCalled()
    expect(calls).toEqual(['GET /merchant/session'])
  })

  it('sends a demo account without a shop to the club setup', async () => {
    const { auth } = setup({ ok: true, value: true }, { 'GET /merchant/session': () => json(404, { code: 'notFound', entity: 'merchant' }) })
    expect(await auth.signInDemoMerchant()).toEqual({ ok: true, value: { kind: 'signUp' } })
  })

  it('asks the gateway whether the demo is on for the merchant', async () => {
    const { auth, gateway } = setup({ ok: true, value: true }, {})
    expect(await auth.demoAvailable()).toBe(true)
    expect(gateway.demoAvailable).toHaveBeenCalledWith('merchant')
  })

  it('sends a confirmed phone without a shop to the club setup, with no ticket', async () => {
    const { auth } = setup({ ok: true, value: true }, { 'GET /merchant/session': () => json(404, { code: 'notFound', entity: 'merchant' }) })
    expect(await auth.signInMerchant(PHONE, CODE)).toEqual({ ok: true, value: { kind: 'signUp' } })
  })

  it('does not ask the API anything when the code is wrong', async () => {
    const { auth, calls } = setup({ ok: false, error: { code: 'invalidLoginCode' } }, {})
    expect(await auth.signInMerchant(PHONE, CODE)).toEqual({ ok: false, error: { code: 'invalidLoginCode' } })
    expect(calls).toEqual([])
  })

  it('does not blame the code when it was accepted but the session did not stick', async () => {
    const { auth } = setup({ ok: true, value: true }, { 'GET /merchant/session': () => json(401, { code: 'unauthorized' }) })
    expect(await auth.signInMerchant(PHONE, CODE)).toEqual({ ok: false, error: { code: 'internal' } })
  })

  it('reads the current session: signed out is unauthorized, no shop is notFound', async () => {
    const out = setup({ ok: true, value: true }, { 'GET /merchant/session': () => json(401, { code: 'unauthorized' }) })
    expect(await out.auth.currentSession()).toEqual({ ok: false, error: { code: 'unauthorized' } })
    const noShop = setup({ ok: true, value: true }, { 'GET /merchant/session': () => json(404, { code: 'notFound', entity: 'merchant' }) })
    expect(await noShop.auth.currentSession()).toMatchObject({ ok: false, error: { code: 'notFound' } })
  })

  it('signs out through the gateway', async () => {
    const { auth, gateway } = setup({ ok: true, value: true }, {})
    expect(await auth.signOut()).toEqual({ ok: true, value: true })
    expect(gateway.signOut).toHaveBeenCalledOnce()
  })
})
