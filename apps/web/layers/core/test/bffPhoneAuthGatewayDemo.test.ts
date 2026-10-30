import { describe, expect, it, vi } from 'vitest'
import { BffPhoneAuthGateway } from '#layers/core/app/services/BffPhoneAuthGateway'

const json = (status: number, body: unknown): Response => new Response(JSON.stringify(body), { status })

describe('BffPhoneAuthGateway demo', () => {
  it('reads only the booleans of the asked surface', async () => {
    const fetcher = vi.fn(async () => json(200, { customer: true, merchant: false }))
    const gateway = new BffPhoneAuthGateway(fetcher)
    expect(await gateway.demoAvailable('customer')).toBe(true)
    expect(await gateway.demoAvailable('merchant')).toBe(false)
    expect(fetcher).toHaveBeenCalledWith('/api/auth/demo')
  })

  it.each([
    ['a server error', () => json(500, { code: 'internal' })],
    ['an unexpected body', () => json(200, { enabled: 'yes' })],
  ])('treats %s as off', async (_name, respond) => {
    expect(await new BffPhoneAuthGateway(async () => respond()).demoAvailable('customer')).toBe(false)
  })

  it('treats a network failure as off', async () => {
    const gateway = new BffPhoneAuthGateway(async () => {
      throw new Error('offline')
    })
    expect(await gateway.demoAvailable('customer')).toBe(false)
  })

  it('posts only the surface to sign in', async () => {
    const fetcher = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => json(200, { ok: true }))
    expect(await new BffPhoneAuthGateway(fetcher).demoSignIn('merchant')).toEqual({ ok: true, value: true })
    expect(fetcher).toHaveBeenCalledWith('/api/auth/demo', expect.objectContaining({ method: 'POST', body: JSON.stringify({ surface: 'merchant' }) }))
  })

  it('reports the refusal of the server', async () => {
    const gateway = new BffPhoneAuthGateway(async () => json(429, { code: 'rateLimited' }))
    expect(await gateway.demoSignIn('customer')).toEqual({ ok: false, error: { code: 'rateLimited' } })
  })
})
