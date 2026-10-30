import { describe, expect, it, vi } from 'vitest'
import { applySetCookie, createServerFetcher } from '../app/utils/serverFetcher'

describe('applySetCookie', () => {
  it('replaces the old value and keeps the other cookies', () => {
    expect(applySetCookie('a=1; lagoa_rt=old', 'lagoa_rt=new; Max-Age=2592000; Path=/; HttpOnly')).toBe('a=1; lagoa_rt=new')
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
