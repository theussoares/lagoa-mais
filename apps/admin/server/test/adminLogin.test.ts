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
