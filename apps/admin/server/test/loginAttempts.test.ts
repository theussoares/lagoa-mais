import { describe, expect, it } from 'vitest'
import { adminLoginAttemptOutcome, captchaCheck } from '../utils/loginAttempts'

describe('admin login attempts', () => {
  it('maps the API answer: 204 may try, 429 over the ceiling, anything else refuses', () => {
    expect(adminLoginAttemptOutcome(204)).toEqual({ ok: true, value: true })
    expect(adminLoginAttemptOutcome(429)).toEqual({ ok: false, code: 'rateLimited' })
    expect(adminLoginAttemptOutcome(503)).toEqual({ ok: false, code: 'internal' })
    expect(adminLoginAttemptOutcome(null)).toEqual({ ok: false, code: 'network' })
  })

  it('refuses to run without the captcha secret in production, and skips it in development', () => {
    expect(captchaCheck('secret', true)).toBe('verify')
    expect(captchaCheck('', true)).toBe('refuse')
    expect(captchaCheck('', false)).toBe('skip')
  })
})
