import { describe, expect, it } from 'vitest'
import { CheckInCodeSchema } from '#shared/schemas/shop'
import type { Translate } from '#layers/core/app/types/i18n'
import { posterNameScale, posterTheme, toCheckInPosterModel } from '../app/utils/posterModel'

const t: Translate = (key, named = {}) => [key, ...Object.entries(named).map(([name, value]) => `${name}=${String(value)}`)].join(' ')

describe('toCheckInPosterModel', () => {
  const poster = {
    shopName: 'Lava-jato Brilho',
    status: 'pending' as const,
    checkInCode: CheckInCodeSchema.parse('GTAKJV'),
    rewardTitle: 'Lavagem grátis',
    unit: 'stamp' as const,
    target: 10,
  }

  it('prints the shop code and a QR for the check-in link on this origin', () => {
    const model = toCheckInPosterModel(poster, 'https://app.lagoa.test', t)
    expect(model.code).toBe('GTAKJV')
    expect(model.rewardTitle).toBe('Lavagem grátis')
    expect(model.qr.size).toBeGreaterThan(0)
    expect(model.qr.d.length).toBeGreaterThan(0)
  })

  it('invites to join the club instead of promising a stamp', () => {
    const model = toCheckInPosterModel(poster, 'https://app.lagoa.test', t)
    expect(model.goal).toBe('poster.goal units=units.stamp count=10')
    expect(model.steps).toEqual(['poster.steps.scan', 'poster.steps.join', 'poster.steps.earn'])
  })

  it('draws the stamp slots up to ten, and none for points programs', () => {
    expect(toCheckInPosterModel({ ...poster, target: 6 }, 'https://app.lagoa.test', t).stampSlots).toBe(6)
    expect(toCheckInPosterModel({ ...poster, target: 25 }, 'https://app.lagoa.test', t).stampSlots).toBe(10)
    expect(toCheckInPosterModel({ ...poster, unit: 'point', target: 100 }, 'https://app.lagoa.test', t).stampSlots).toBe(0)
    expect(toCheckInPosterModel({ ...poster, shopName: 'Distribuidora de Bebidas e Conveniência Três Lagoas' }, 'https://app.lagoa.test', t).stampSlots).toBe(0)
  })

  it('describes the QR without spelling out the link', () => {
    const model = toCheckInPosterModel(poster, 'https://app.lagoa.test', t)
    expect(model.qrLabel).toBe('poster.qrLabel shop=Lava-jato Brilho')
    expect(model.qrLabel).not.toContain('http')
  })
})

describe('poster look per shop', () => {
  it('keeps the same color for the same shop and uses the whole palette across shops', () => {
    expect(posterTheme('Bibi lava car')).toBe(posterTheme('  bibi LAVA car '))
    const themes = new Set(['Bibi lava car', 'Padaria Lagoa', 'Studio Ana', 'Café do Zé', 'Oficina Sul', 'Pet Shop Amigo'].map(posterTheme))
    expect(themes.size).toBeGreaterThan(1)
  })

  it('shrinks long names so they stay on few lines', () => {
    expect(posterNameScale('Bibi lava car')).toBe('large')
    expect(posterNameScale('Auto Center Três Lagoas')).toBe('medium')
    expect(posterNameScale('Distribuidora de Bebidas e Conveniência Três Lagoas')).toBe('small')
  })
})
