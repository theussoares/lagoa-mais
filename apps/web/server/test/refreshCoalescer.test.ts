import { describe, expect, it, vi } from 'vitest'
import { REFRESH_REUSE_WINDOW_MS, RefreshCoalescer } from '../utils/refreshCoalescer'
import type { AuthOutcome, TokenPair } from '../types/auth'

const tokens: TokenPair = { accessToken: 'at2', refreshToken: 'rt2', expiresIn: 3600, userId: 'u' }
const ok: AuthOutcome<TokenPair> = { ok: true, value: tokens }

describe('RefreshCoalescer', () => {
  it('spends a refresh token once for parallel requests', async () => {
    const run = vi.fn(async () => ok)
    const coalescer = new RefreshCoalescer()
    const results = await Promise.all([coalescer.refresh('rt1', run), coalescer.refresh('rt1', run), coalescer.refresh('rt1', run)])
    expect(run).toHaveBeenCalledTimes(1)
    expect(results.every((result) => result === results[0])).toBe(true)
  })

  it('serves a late request with the same old token from the stored result, until the window ends', async () => {
    let now = 0
    const run = vi.fn(async () => ok)
    const coalescer = new RefreshCoalescer(() => now)
    await coalescer.refresh('rt1', run)
    now = REFRESH_REUSE_WINDOW_MS - 1
    await coalescer.refresh('rt1', run)
    expect(run).toHaveBeenCalledTimes(1)
    now = REFRESH_REUSE_WINDOW_MS + 1
    await coalescer.refresh('rt1', run)
    expect(run).toHaveBeenCalledTimes(2)
  })

  it('does not keep failures, so the next request tries again', async () => {
    const run = vi
      .fn<(token: string) => Promise<AuthOutcome<TokenPair>>>()
      .mockResolvedValueOnce({ ok: false, code: 'network' })
      .mockResolvedValueOnce(ok)
    const coalescer = new RefreshCoalescer()
    await coalescer.refresh('rt1', run)
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect((await coalescer.refresh('rt1', run)).ok).toBe(true)
    expect(run).toHaveBeenCalledTimes(2)
  })

  it('keeps different tokens apart', async () => {
    const run = vi.fn(async () => ok)
    const coalescer = new RefreshCoalescer()
    await Promise.all([coalescer.refresh('a', run), coalescer.refresh('b', run)])
    expect(run).toHaveBeenCalledTimes(2)
  })

  it('keeps the window within the Supabase reuse interval (10 s)', () => {
    expect(REFRESH_REUSE_WINDOW_MS).toBeLessThanOrEqual(10_000)
  })

  it('forget drops the cache by the old token and by the token it returned', async () => {
    for (const forgotten of ['rt1', 'rt2']) {
      const run = vi.fn(async () => ok)
      const coalescer = new RefreshCoalescer()
      await coalescer.refresh('rt1', run)
      coalescer.forget(forgotten)
      await coalescer.refresh('rt1', run)
      expect(run).toHaveBeenCalledTimes(2)
    }
  })

  it('never evicts a pending refresh, even long after it started', async () => {
    let now = 0
    let release: (outcome: AuthOutcome<TokenPair>) => void = () => undefined
    const slow = vi.fn(() => new Promise<AuthOutcome<TokenPair>>((resolve) => (release = resolve)))
    const coalescer = new RefreshCoalescer(() => now)
    const first = coalescer.refresh('rt1', slow)
    now = REFRESH_REUSE_WINDOW_MS * 10
    const second = coalescer.refresh('rt1', slow)
    release(ok)
    await Promise.all([first, second])
    expect(slow).toHaveBeenCalledTimes(1)
  })
})
