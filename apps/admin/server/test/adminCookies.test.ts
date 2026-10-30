import { describe, expect, it } from 'vitest'
import { ADMIN_ACCESS_COOKIE, ADMIN_REFRESH_COOKIE, adminSessionCookiesFor, expiredAdminCookiesFor } from '../utils/adminCookies'

const tokens = { accessToken: 'at', refreshToken: 'rt', expiresIn: 3600, userId: 'admin-1' }

describe('admin cookies', () => {
  it('are httpOnly, SameSite=Strict, host-only (no Domain) and at the root', () => {
    const cookies = adminSessionCookiesFor(tokens, { secure: true }, 43_200)
    expect(cookies.map((cookie) => cookie.name)).toEqual([ADMIN_ACCESS_COOKIE, ADMIN_REFRESH_COOKIE])
    for (const cookie of cookies) {
      expect(cookie.options).toMatchObject({ httpOnly: true, secure: true, sameSite: 'strict', path: '/' })
      expect(cookie.options).not.toHaveProperty('domain')
    }
  })

  it('never share a name with the customer or merchant session cookies', () => {
    expect([ADMIN_ACCESS_COOKIE, ADMIN_REFRESH_COOKIE]).toEqual(['lagoa_admin_at', 'lagoa_admin_rt'])
  })

  it('make the access cookie expire a little before the token does', () => {
    expect(adminSessionCookiesFor(tokens, { secure: false }, 43_200)[0]?.options.maxAge).toBe(3570)
  })

  it('expire both on sign out', () => {
    expect(expiredAdminCookiesFor({ secure: false }).map((cookie) => [cookie.name, cookie.value, cookie.options.maxAge])).toEqual([
      [ADMIN_ACCESS_COOKIE, '', 0],
      [ADMIN_REFRESH_COOKIE, '', 0],
    ])
  })
})
