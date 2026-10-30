import { describe, expect, it } from 'vitest'
import { claimsOf } from '../utils/tokenClaims'

const encode = (payload: unknown): string => `e30.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.sig`

describe('claimsOf', () => {
  it('reads the assurance level, the role and the e-mail of a Supabase token', () => {
    expect(claimsOf(encode({ sub: 'a1', aal: 'aal2', email: 'ana@rede.test', app_metadata: { role: 'admin' } }))).toEqual({
      sub: 'a1',
      aal: 'aal2',
      email: 'ana@rede.test',
      isAdmin: true,
      signedInAt: null,
    })
  })

  it('treats a token without the admin role as not admin, and a broken one as nothing', () => {
    expect(claimsOf(encode({ sub: 'c1', aal: 'aal1', app_metadata: {} }))?.isAdmin).toBe(false)
    expect(claimsOf('not-a-token')).toBeNull()
    expect(claimsOf(encode({ aal: 'aal3' }))).toBeNull()
  })
})
