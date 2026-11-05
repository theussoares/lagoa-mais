import { describe, expect, it } from 'vitest'
import { canEnroll, confirmationFactor, mfaStep, verifyTarget } from '../utils/mfaPlan'

const none = { verified: [], pending: [] }
const enrolled = { verified: ['old'], pending: [] }

describe('mfaPlan', () => {
  it('asks a first-time admin to enroll, and someone with an authenticator for the code', () => {
    expect(mfaStep('aal1', none)).toBe('enroll')
    expect(mfaStep('aal1', { verified: [], pending: ['half'] })).toBe('enroll')
    expect(mfaStep('aal1', enrolled)).toBe('verify')
    expect(mfaStep('aal2', enrolled)).toBe('done')
  })

  it('never lets the password alone add an authenticator to an account that already has one', () => {
    expect(canEnroll('aal1', none)).toBe(true)
    expect(canEnroll('aal1', enrolled)).toBe(false)
    expect(canEnroll('aal2', enrolled)).toBe(true)
  })

  it('with only the password, verifies against the confirmed authenticator, never a half-made new one', () => {
    expect(verifyTarget('aal1', { verified: ['old'], pending: ['new'] })).toEqual({ factorId: 'old', replaces: [] })
  })

  it('confirms the first authenticator during enrollment', () => {
    expect(verifyTarget('aal1', { verified: [], pending: ['a', 'b'] })).toEqual({ factorId: 'b', replaces: [] })
    expect(verifyTarget('aal1', none)).toBeNull()
  })

  it('with a full session, confirming a new authenticator replaces the old ones', () => {
    expect(verifyTarget('aal2', { verified: ['old'], pending: ['new'] })).toEqual({ factorId: 'new', replaces: ['old'] })
    expect(verifyTarget('aal2', enrolled)).toBeNull()
  })
})

describe('confirmationFactor', () => {
  it('asks the code of the confirmed authenticator before touching the password or swapping it', () => {
    expect(confirmationFactor({ verified: ['old'], pending: ['new'] })).toBe('old')
  })

  it('asks nothing of an account that never confirmed one (first access, invite link)', () => {
    expect(confirmationFactor({ verified: [], pending: ['half'] })).toBeNull()
  })
})
