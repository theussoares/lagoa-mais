import { describe, expect, it } from 'vitest'
import { adminSessionCookiesFor } from '../utils/adminCookies'
import { sessionSecondsLeft } from '../utils/sessionLifetime'
import { claimsOf } from '../utils/tokenClaims'

const HOUR = 3600
const signedInAt = 1_800_000_000
const at = (seconds: number): Date => new Date(seconds * 1000)
const jwt = (payload: unknown): string => `e30.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.sig`

describe('admin session lifetime', () => {
  it('counts 12 hours from the sign-in, not from the last refresh', () => {
    expect(sessionSecondsLeft(signedInAt, at(signedInAt + HOUR))).toBe(11 * HOUR)
    expect(sessionSecondsLeft(signedInAt, at(signedInAt + 12 * HOUR))).toBe(0)
    expect(sessionSecondsLeft(signedInAt, at(signedInAt + 30 * HOUR))).toBe(0)
  })

  it('takes the sign-in time from the first authentication of the token (password), which a refresh keeps', () => {
    const token = jwt({ sub: 'a1', aal: 'aal2', iat: signedInAt + 5 * HOUR, amr: [{ method: 'totp', timestamp: signedInAt + 60 }, { method: 'password', timestamp: signedInAt }] })
    expect(claimsOf(token)?.signedInAt).toBe(signedInAt)
  })

  it('treats a token without authentication times as already over', () => {
    expect(claimsOf(jwt({ sub: 'a1', aal: 'aal1' }))?.signedInAt).toBeNull()
    expect(sessionSecondsLeft(null, at(signedInAt))).toBe(0)
  })

  it('writes the refresh cookie only for the time left, so a refresh never extends the session', () => {
    const tokens = { accessToken: 'at', refreshToken: 'rt', expiresIn: HOUR, userId: 'a1' }
    expect(adminSessionCookiesFor(tokens, { secure: true }, 2 * HOUR)[1]?.options.maxAge).toBe(2 * HOUR)
  })
})
