import { describe, expect, it } from 'vitest'
import { isCompletePostalCode, maskPostalCode, postalCodeDigits } from '../app/utils/postalCodeForm'

describe('postalCodeDigits', () => {
  it('keeps only digits, up to eight', () => {
    expect(postalCodeDigits('79601-000')).toBe('79601000')
    expect(postalCodeDigits(' 7a9b6 ')).toBe('796')
    expect(postalCodeDigits('796010001234')).toBe('79601000')
  })
})

describe('maskPostalCode', () => {
  it('writes 00000-000 and only adds the hyphen when a digit follows it', () => {
    expect(maskPostalCode('')).toBe('')
    expect(maskPostalCode('79601')).toBe('79601')
    expect(maskPostalCode('796010')).toBe('79601-0')
    expect(maskPostalCode('79601000')).toBe('79601-000')
    expect(maskPostalCode('79601-000')).toBe('79601-000')
  })
})

describe('isCompletePostalCode', () => {
  it('needs all eight digits', () => {
    expect(isCompletePostalCode('7960100')).toBe(false)
    expect(isCompletePostalCode('79601000')).toBe(true)
  })
})
