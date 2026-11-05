import { describe, expect, it } from 'vitest'
import { redirectFor } from '../utils/sessionRoute'

describe('redirectFor', () => {
  it('sends someone without a session to sign in, and lets the public pages open', () => {
    expect(redirectFor(null, '/lojas')).toBe('/entrar')
    expect(redirectFor(null, '/autenticador')).toBe('/entrar')
    expect(redirectFor(null, '/entrar')).toBeNull()
    expect(redirectFor(null, '/esqueci-a-senha')).toBeNull()
    expect(redirectFor(null, '/definir-senha')).toBeNull()
  })

  it('sends a session in the middle of MFA (verify or enroll) to the authenticator step', () => {
    expect(redirectFor({ next: 'verify' }, '/lojas')).toBe('/autenticador')
    expect(redirectFor({ next: 'enroll' }, '/entrar')).toBe('/autenticador')
    expect(redirectFor({ next: 'verify' }, '/autenticador')).toBeNull()
  })

  it('sends a full session away from the sign-in steps, and lets it open the panel', () => {
    expect(redirectFor({ admin: { name: 'Ana' } }, '/entrar')).toBe('/lojas')
    expect(redirectFor({ admin: { name: 'Ana' } }, '/autenticador')).toBe('/lojas')
    expect(redirectFor({ admin: { name: 'Ana' } }, '/hits')).toBeNull()
  })
})
