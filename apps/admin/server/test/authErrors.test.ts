import { describe, expect, it } from 'vitest'
import { adminAuthErrorStatus, passwordErrorCodeOf, refreshErrorCodeOf, signInErrorCodeOf, verifyErrorCodeOf } from '../utils/authErrors'

describe('admin auth errors', () => {
  it('turns any refusal of the password into the generic error (unconfirmed e-mail included)', () => {
    expect(signInErrorCodeOf({ status: 400, code: 'invalid_credentials' })).toBe('invalidCredentials')
    expect(signInErrorCodeOf({ status: 400, code: 'email_not_confirmed' })).toBe('invalidCredentials')
  })

  it('keeps the provider limit and the network apart from a wrong password', () => {
    expect(signInErrorCodeOf({ status: 429, code: 'over_request_rate_limit' })).toBe('rateLimited')
    expect(signInErrorCodeOf({})).toBe('network')
    expect(signInErrorCodeOf({ status: 500 })).toBe('internal')
  })

  it('maps a wrong authenticator code, a weak password and a refused refresh', () => {
    expect(verifyErrorCodeOf({ status: 422, code: 'mfa_verification_failed' })).toBe('invalidMfaCode')
    expect(passwordErrorCodeOf({ status: 422, code: 'weak_password' })).toBe('weakPassword')
    expect(passwordErrorCodeOf({ status: 422, code: 'same_password' })).toBe('weakPassword')
    expect(refreshErrorCodeOf({ status: 400, code: 'refresh_token_not_found' })).toBe('unauthorized')
    expect(refreshErrorCodeOf({ status: 503 })).toBe('internal')
  })

  it('gives each code its HTTP status', () => {
    expect(adminAuthErrorStatus('captchaFailed')).toBe(400)
    expect(adminAuthErrorStatus('unauthorized')).toBe(401)
    expect(adminAuthErrorStatus('forbidden')).toBe(403)
    expect(adminAuthErrorStatus('rateLimited')).toBe(429)
  })
})
