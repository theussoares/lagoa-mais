import { describe, expect, it } from 'vitest'
import { setPasswordRequest } from '../utils/passwordForm'

const link = { status: 'ok' as const, accessToken: 'at', refreshToken: 'rt', kind: 'recovery' as const }

describe('setPasswordRequest', () => {
  it('sends the code only once the server asked for it (account with an authenticator)', () => {
    expect(setPasswordRequest(link, 'senha-nova-123', '')).toEqual({ accessToken: 'at', refreshToken: 'rt', password: 'senha-nova-123' })
    expect(setPasswordRequest(link, 'senha-nova-123', '123456')).toEqual({ accessToken: 'at', refreshToken: 'rt', password: 'senha-nova-123', code: '123456' })
  })
})
