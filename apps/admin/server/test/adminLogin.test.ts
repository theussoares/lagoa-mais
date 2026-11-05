import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'
import { AdminLogin } from '../utils/adminLogin'

const jwt = (payload: unknown): string => `e30.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.sig`

describe('AdminLogin.use', () => {
  it('reads the claims of the session Supabase opened, never of the cookie it was given', async () => {
    // Token forjado e vencido: o supabase-js nem confere, só troca pelo refresh token e abre a sessão de verdade.
    const forged = jwt({ sub: 'admin-1', aal: 'aal2', email: 'fake-1@x.test', exp: 1, app_metadata: { role: 'admin' } })
    const real = jwt({ sub: 'admin-1', aal: 'aal1', email: 'ana@rede.test', app_metadata: { role: 'admin' } })
    const setSession = vi.fn(async () => ({
      data: { session: { access_token: real, refresh_token: 'rt-2', expires_in: 3600, user: { id: 'admin-1' } }, user: { id: 'admin-1' } },
      error: null,
    }))
    const login = new AdminLogin({ auth: { setSession } } as unknown as SupabaseClient)
    const opened = await login.use({ accessToken: forged, refreshToken: 'rt-1' })
    expect(opened).toEqual({
      ok: true,
      value: {
        tokens: { accessToken: real, refreshToken: 'rt-2', expiresIn: 3600, userId: 'admin-1' },
        claims: expect.objectContaining({ aal: 'aal1', email: 'ana@rede.test' }),
      },
    })
  })
})

describe('AdminLogin factor and session revocation', () => {
  it('stops at the first failed unenroll and reports it (the old authenticator is still valid)', async () => {
    const unenroll = vi.fn()
      .mockResolvedValueOnce({ error: null })
      .mockResolvedValueOnce({ error: { status: 500 } })
    const login = new AdminLogin({ auth: { mfa: { unenroll } } } as unknown as SupabaseClient)
    expect(await login.unenroll(['f1', 'f2', 'f3'])).toEqual({ ok: false, code: 'internal' })
    expect(unenroll).toHaveBeenCalledTimes(2)
    expect(await new AdminLogin({ auth: { mfa: { unenroll: vi.fn(async () => ({ error: null })) } } } as unknown as SupabaseClient).unenroll(['f1'])).toEqual({ ok: true, value: true })
  })

  it('does not enroll a new factor while a half-done one could not be discarded', async () => {
    const enroll = vi.fn()
    const unenroll = vi.fn(async () => ({ error: { status: 500 } }))
    const login = new AdminLogin({ auth: { mfa: { unenroll, enroll } } } as unknown as SupabaseClient)
    expect(await login.enroll(['pending-1'])).toEqual({ ok: false, code: 'internal' })
    expect(enroll).not.toHaveBeenCalled()
  })

  it('revokes the other (or every) session with the requested scope and reports a failure', async () => {
    const signOut = vi.fn(async () => ({ error: null }))
    const login = new AdminLogin({ auth: { signOut } } as unknown as SupabaseClient)
    expect(await login.revokeSessions('others')).toEqual({ ok: true, value: true })
    await login.revokeSessions('global')
    expect(signOut).toHaveBeenNthCalledWith(1, { scope: 'others' })
    expect(signOut).toHaveBeenNthCalledWith(2, { scope: 'global' })
    const failing = new AdminLogin({ auth: { signOut: vi.fn(async () => ({ error: { status: 502 } })) } } as unknown as SupabaseClient)
    expect(await failing.revokeSessions('global')).toEqual({ ok: false, code: 'internal' })
  })
})
