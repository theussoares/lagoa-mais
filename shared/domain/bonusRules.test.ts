import { describe, expect, it } from 'vitest'
import type { BonusRules } from '../schemas/program'
import { applyVisitBonuses, isBirthdayToday, isSurpriseDay, welcomeUnits, withActiveSurpriseDay } from './bonusRules'

const rules: BonusRules = {
  welcomeBonus: { enabled: true, units: 2 },
  birthdayMultiplier: { enabled: true, multiplier: 2 },
  referralBonus: { enabled: false, units: 1 },
  surpriseDay: { enabled: true, multiplier: 2, date: '2026-10-01' },
}
const today = { isoDate: '2026-10-01', monthDay: '10-01' }

describe('applyVisitBonuses', () => {
  it('doubles on the customer birthday', () => {
    const result = applyVisitBonuses(1, { ...rules, surpriseDay: { ...rules.surpriseDay, enabled: false } }, {
      today,
      customerBirthday: '10-01',
    })
    expect(result).toEqual({ units: 2, applied: ['birthdayMultiplier'] })
  })

  it('does not stack birthday and surprise day', () => {
    expect(applyVisitBonuses(1, rules, { today, customerBirthday: '10-01' }).units).toBe(2)
  })

  it('keeps base units on an ordinary day', () => {
    expect(applyVisitBonuses(3, rules, { today: { isoDate: '2026-10-02', monthDay: '10-02' }, customerBirthday: null })).toEqual({
      units: 3,
      applied: [],
    })
  })
})

describe('welcomeUnits', () => {
  it('is zero when the welcome rule is off', () => {
    expect(welcomeUnits({ ...rules, welcomeBonus: { enabled: false, units: 2 } })).toBe(0)
    expect(welcomeUnits(rules)).toBe(2)
  })
})

describe('isBirthdayToday', () => {
  it('celebrates February 29 on February 28 when the year has no 29', () => {
    expect(isBirthdayToday('02-29', { isoDate: '2026-02-28', monthDay: '02-28' })).toBe(true)
  })

  it('keeps February 29 on its own day in a leap year', () => {
    expect(isBirthdayToday('02-29', { isoDate: '2028-02-28', monthDay: '02-28' })).toBe(false)
    expect(isBirthdayToday('02-29', { isoDate: '2028-02-29', monthDay: '02-29' })).toBe(true)
  })

  it('treats 1900 and 2100 as common years and 2000 as leap', () => {
    expect(isBirthdayToday('02-29', { isoDate: '2100-02-28', monthDay: '02-28' })).toBe(true)
    expect(isBirthdayToday('02-29', { isoDate: '2000-02-28', monthDay: '02-28' })).toBe(false)
  })

  it('is never true without a birthday', () => {
    expect(isBirthdayToday(null, { isoDate: '2026-10-01', monthDay: '10-01' })).toBe(false)
  })
})

describe('withActiveSurpriseDay', () => {
  const active = { enabled: true, multiplier: 2 as const, date: '2026-10-29' }
  const oldVersion: BonusRules = { ...rules, surpriseDay: { enabled: false, multiplier: 2, date: null }, welcomeBonus: { enabled: true, units: 5 } }

  it('takes the surprise day from the active version and keeps the rest of the card version', () => {
    const merged = withActiveSurpriseDay(oldVersion, active)
    expect(merged.surpriseDay).toEqual(active)
    expect(merged.welcomeBonus).toEqual({ enabled: true, units: 5 })
  })

  it('doubles a visit today for a card whose own version has the surprise day off', () => {
    const merged = withActiveSurpriseDay(oldVersion, active)
    const result = applyVisitBonuses(1, merged, { today: { isoDate: '2026-10-29', monthDay: '10-29' }, customerBirthday: null })
    expect(result).toEqual({ units: 2, applied: ['surpriseDay'] })
  })

  it('stops doubling as soon as the active version switches it off, even if the card version had it on', () => {
    const merged = withActiveSurpriseDay(rules, { enabled: false, multiplier: 2, date: '2026-10-01' })
    expect(isSurpriseDay(merged, '2026-10-01')).toBe(false)
  })
})
