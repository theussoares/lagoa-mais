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
})
