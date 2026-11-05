import { describe, expect, it } from 'vitest'
import { getComparisonRanges, minComparisonStart, summarizeComparison } from './homeComparison'
import { CustomerIdSchema } from '../schemas/ids'

describe('homeComparison', () => {
  const now = new Date('2026-10-19T14:30:00Z') // Outubro 19, 10:30 UTC-4

  it('calculates ranges properly for week, month, last30', () => {
    const ranges = getComparisonRanges(now)

    expect(ranges.week.current.end).toEqual(now)
    expect(ranges.month.current.end).toEqual(now)
    expect(ranges.last30.current.end).toEqual(now)

    // Semana: 7 dias contínuos sem buraco
    expect(ranges.week.current.start.toISOString().slice(0, 10)).toBe('2026-10-13')
    expect(ranges.week.previous.start.toISOString().slice(0, 10)).toBe('2026-10-06')
    expect(ranges.week.previous.end).toEqual(ranges.week.current.start)

    // Últimos 30 dias: 30 dias contínuos sem buraco
    expect(ranges.last30.previous.end).toEqual(ranges.last30.current.start)

    // Mês: Outubro 1 vs Setembro 1
    expect(ranges.month.current.start.toISOString().slice(0, 10)).toBe('2026-10-01')
    expect(ranges.month.previous.start.toISOString().slice(0, 10)).toBe('2026-09-01')
  })

  it('counts boundary events without holes or duplicates between current and previous', () => {
    const ranges = getComparisonRanges(now)
    const boundaryTime = ranges.week.current.start // Exato instante de transição
    const oneSecondBefore = new Date(boundaryTime.getTime() - 1000)
    const oneSecondAfter = new Date(boundaryTime.getTime() + 1000)

    const records = [
      { kind: 'visit' as const, createdAt: oneSecondBefore, amountCents: null },
      { kind: 'visit' as const, createdAt: boundaryTime, amountCents: null },
      { kind: 'visit' as const, createdAt: oneSecondAfter, amountCents: null },
    ]

    const result = summarizeComparison(records, [], now)
    // oneSecondBefore cai na anterior; boundaryTime e oneSecondAfter caem na atual
    expect(result.week.visits.previous).toBe(1)
    expect(result.week.visits.current).toBe(2)
  })

  it('summarizes comparison counts accurately', () => {
    const cus1 = CustomerIdSchema.parse('cus_1')
    const cus2 = CustomerIdSchema.parse('cus_2')

    const newCustomers = [
      { customerId: cus1, createdAt: '2026-10-15T12:00:00Z' }, // esta semana, este mês, últimos 30
      { customerId: cus2, createdAt: '2026-10-08T12:00:00Z' }, // semana anterior, este mês, últimos 30
    ]

    const records = [
      // Visita com compra nesta semana
      { kind: 'visit' as const, createdAt: '2026-10-18T10:00:00Z', amountCents: 4500 },
      // Visita simples nesta semana
      { kind: 'checkIn' as const, createdAt: '2026-10-17T15:00:00Z', amountCents: null },
      // Resgate nesta semana
      { kind: 'redemption' as const, createdAt: '2026-10-16T11:00:00Z', amountCents: null },
      // Visita na semana anterior
      { kind: 'visit' as const, createdAt: '2026-10-08T10:00:00Z', amountCents: 3000 },
    ]

    const result = summarizeComparison(records, newCustomers, now)

    expect(result.week.visits.current).toBe(2)
    expect(result.week.visits.previous).toBe(1)
    expect(result.week.purchases.current).toBe(1)
    expect(result.week.purchases.previous).toBe(1)
    expect(result.week.redemptions.current).toBe(1)
    expect(result.week.redemptions.previous).toBe(0)
    expect(result.week.newCustomers.current).toBe(1)
    expect(result.week.newCustomers.previous).toBe(1)
  })

  it('includes day 1 of previous month on 31/12, 31/10 and 31/08 in minComparisonStart and summarizeComparison', () => {
    const cus1 = CustomerIdSchema.parse('cus_1')

    // 31/12 local (UTC-4) -> 2026-12-31T18:00:00Z; mês anterior começa em 01/11 local (2026-11-01T04:00:00Z)
    const dec31 = new Date('2026-12-31T18:00:00Z')
    const decRanges = getComparisonRanges(dec31)
    const decMin = minComparisonStart(decRanges)
    expect(decMin.getTime()).toBeLessThanOrEqual(decRanges.month.previous.start.getTime())
    expect(decMin).toEqual(new Date('2026-11-01T04:00:00.000Z'))

    const nov1Record = { kind: 'visit' as const, createdAt: '2026-11-01T05:00:00Z', amountCents: 2000 }
    const decSummary = summarizeComparison([nov1Record], [{ customerId: cus1, createdAt: '2026-11-01T05:00:00Z' }], dec31)
    expect(decSummary.month.visits.previous).toBe(1)
    expect(decSummary.month.purchases.previous).toBe(1)
    expect(decSummary.month.newCustomers.previous).toBe(1)

    // 31/10 local -> mês anterior começa em 01/09 local (2026-09-01T04:00:00Z)
    const oct31 = new Date('2026-10-31T18:00:00Z')
    const octRanges = getComparisonRanges(oct31)
    const octMin = minComparisonStart(octRanges)
    expect(octMin.getTime()).toBeLessThanOrEqual(octRanges.month.previous.start.getTime())
    expect(octMin).toEqual(new Date('2026-09-01T04:00:00.000Z'))

    const sep1Record = { kind: 'visit' as const, createdAt: '2026-09-01T05:00:00Z', amountCents: null }
    const octSummary = summarizeComparison([sep1Record], [{ customerId: cus1, createdAt: '2026-09-01T05:00:00Z' }], oct31)
    expect(octSummary.month.visits.previous).toBe(1)
    expect(octSummary.month.newCustomers.previous).toBe(1)

    // 31/08 local -> mês anterior começa em 01/07 local (2026-07-01T04:00:00Z), 2 dias antes de last30.previous.start
    const aug31 = new Date('2026-08-31T18:00:00Z')
    const augRanges = getComparisonRanges(aug31)
    const augMin = minComparisonStart(augRanges)
    expect(augMin).toEqual(new Date('2026-07-01T04:00:00.000Z'))
  })
})
