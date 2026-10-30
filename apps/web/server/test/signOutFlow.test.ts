import { describe, expect, it, vi } from 'vitest'
import { signOutFlow, type SignOutSteps, type SignOutTokens } from '../utils/signOutFlow'

function steps(stored: SignOutSteps['stored'], renewed: SignOutTokens | null = { accessToken: 'at2', refreshToken: 'rt2' }) {
  return {
    stored,
    renew: vi.fn(async () => renewed ?? undefined),
    revoke: vi.fn(async () => undefined),
    forget: vi.fn(),
    clearCookies: vi.fn(),
  }
}

describe('signOutFlow', () => {
  it('renews an expired access cookie, revokes the new session locally and clears cookies', async () => {
    const s = steps({ accessToken: undefined, refreshToken: 'rt1' })
    await signOutFlow(s)
    expect(s.renew).toHaveBeenCalledWith('rt1')
    expect(s.revoke).toHaveBeenCalledWith({ accessToken: 'at2', refreshToken: 'rt2' })
    expect(s.forget).toHaveBeenCalledWith('rt1', 'rt2')
    expect(s.clearCookies).toHaveBeenCalledTimes(1)
  })

  it('still clears cookies when the renewal fails', async () => {
    const s = steps({ accessToken: undefined, refreshToken: 'rt1' }, null)
    await signOutFlow(s)
    expect(s.revoke).not.toHaveBeenCalled()
    expect(s.forget).toHaveBeenCalledWith('rt1')
    expect(s.clearCookies).toHaveBeenCalledTimes(1)
  })

  it('still clears cookies when the revoke throws', async () => {
    const s = steps({ accessToken: 'at1', refreshToken: 'rt1' })
    s.revoke.mockRejectedValue(new Error('down'))
    await expect(signOutFlow(s)).rejects.toThrow()
    expect(s.clearCookies).toHaveBeenCalledTimes(1)
  })

  it('revokes with the stored pair without renewing when the access cookie is present', async () => {
    const s = steps({ accessToken: 'at1', refreshToken: 'rt1' })
    await signOutFlow(s)
    expect(s.renew).not.toHaveBeenCalled()
    expect(s.revoke).toHaveBeenCalledWith({ accessToken: 'at1', refreshToken: 'rt1' })
  })

  it('only clears cookies when there is no session', async () => {
    const s = steps({ accessToken: undefined, refreshToken: undefined })
    await signOutFlow(s)
    expect(s.revoke).not.toHaveBeenCalled()
    expect(s.clearCookies).toHaveBeenCalledTimes(1)
  })
})
