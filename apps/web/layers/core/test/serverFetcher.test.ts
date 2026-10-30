import { describe, expect, it, vi } from 'vitest'
import { applySetCookie, createServerFetcher } from '../app/utils/serverFetcher'

describe('applySetCookie', () => {
  it('replaces the old value and keeps the other cookies', () => {
    expect(applySetCookie('a=1; lagoa_rt=old', 'lagoa_rt=new; Max-Age=2592000; Path=/; HttpOnly')).toBe('a=1; lagoa_rt=new')
  })
  it('ignores the legacy /api delete so it does not remove the / cookie', () => {
    expect(applySetCookie('lagoa_rt=y', 'lagoa_rt=; Max-Age=0; Path=/api')).toBe('lagoa_rt=y')
  })
  it('ignores cookies that are not session cookies', () => {
    expect(applySetCookie('lagoa_rt=y', 'other=1; Path=/')).toBe('lagoa_rt=y')
  })
  it('treats a past Expires as removal and a future one as a write', () => {
    expect(applySetCookie('lagoa_rt=y', 'lagoa_rt=z; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/')).toBe('')
    expect(applySetCookie('', 'lagoa_rt=z; Expires=Fri, 01 Jan 2100 00:00:00 GMT; Path=/')).toBe('lagoa_rt=z')
  })
  it('drops expired cookies', () => {
    expect(applySetCookie('lagoa_at=x; lagoa_rt=y', 'lagoa_at=; Max-Age=0; Path=/')).toBe('lagoa_rt=y')
  })
})

describe('createServerFetcher', () => {
  it('sends the refreshed cookie on the next call of the same render', async () => {
    const seen: (string | undefined)[] = []
    const localFetch = vi.fn(async (_input: string, init?: RequestInit) => {
      seen.push((init?.headers as Record<string, string>).cookie)
      const headers = new Headers()
      if (seen.length === 1) headers.append('set-cookie', 'lagoa_rt=new; Max-Age=2592000; Path=/')
      return new Response('{}', { headers })
    })
    const written: string[] = []
    const fetcher = createServerFetcher({ localFetch, forwarded: { cookie: 'lagoa_rt=old' }, onSetCookie: (cookie) => written.push(cookie) })
    await fetcher('/api/a')
    await fetcher('/api/b')
    expect(seen).toEqual(['lagoa_rt=old', 'lagoa_rt=new'])
    expect(written).toHaveLength(1)
  })
})
