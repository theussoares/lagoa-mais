import { describe, expect, it, vi } from 'vitest'
import { verifyTurnstile } from '../utils/turnstile'

const answer = (body: unknown, status = 200): Response => new Response(JSON.stringify(body), { status })

describe('verifyTurnstile', () => {
  it('passes only when Cloudflare says success', async () => {
    const fetcher = vi.fn(async () => answer({ success: true }))
    expect(await verifyTurnstile('token', 'secret', '1.2.3.4', fetcher)).toBe(true)
    const [url, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://challenges.cloudflare.com/turnstile/v0/siteverify')
    expect(String(init.body)).toContain('remoteip=1.2.3.4')
  })

  it('fails closed when the network fails, the answer is odd or Cloudflare refuses', async () => {
    expect(await verifyTurnstile('token', 'secret', undefined, async () => Promise.reject(new Error('down')))).toBe(false)
    expect(await verifyTurnstile('token', 'secret', undefined, async () => new Response('nope', { status: 200 }))).toBe(false)
    expect(await verifyTurnstile('token', 'secret', undefined, async () => answer({ success: false }))).toBe(false)
    expect(await verifyTurnstile('token', 'secret', undefined, async () => answer({ success: true }, 500))).toBe(false)
  })

  it('refuses an empty token or secret without asking Cloudflare', async () => {
    const fetcher = vi.fn(async () => answer({ success: true }))
    expect(await verifyTurnstile('', 'secret', undefined, fetcher)).toBe(false)
    expect(await verifyTurnstile('token', '', undefined, fetcher)).toBe(false)
    expect(fetcher).not.toHaveBeenCalled()
  })
})
