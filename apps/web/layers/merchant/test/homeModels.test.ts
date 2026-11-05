import { describe, expect, it } from 'vitest'
import type { CampaignId, CustomerId, ProgramId, ShopId } from '#shared/schemas/ids'
import { MaskedPhoneSchema } from '#shared/schemas/phone'
import type { CampaignOverview } from '#shared/schemas/campaign'
import type { HomeOverview } from '#shared/schemas/homeOverview'
import type { Program } from '#shared/schemas/program'
import type { WeekSummary } from '#shared/schemas/weekSummary'
import type { Translate } from '#layers/core/app/types/i18n'
import { customerFilterFromSlug, customerFilterSlug } from '../app/utils/customerFilterQuery'
import {
  formatDashboardDate,
  toHomeActiveCampaignModels,
  toHomeActivityModels,
  toHomeComparisonModels,
  toHomeIndicatorModels,
  toHomeOpportunityModels,
} from '../app/utils/homeModels'

const t: Translate = (key, named = {}, plural) =>
  [key, ...Object.entries(named).map(([name, value]) => `${name}=${String(value)}`), plural === undefined ? '' : `#${plural}`]
    .filter(Boolean)
    .join(' ')

function week(overrides: Partial<WeekSummary> = {}): WeekSummary {
  const days = ['2026-09-26', '2026-09-27', '2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02'].map((isoDate) => ({
    isoDate,
    visits: 0,
    newCustomers: 0,
    redemptions: 0,
    amountCents: 0,
  }))
  return { days, visits: 0, customers: 0, newCustomers: 0, redemptions: 0, amountCents: 0, ...overrides }
}

function overview(overrides: Partial<HomeOverview> = {}): HomeOverview {
  return {
    lapsed: { total: 4, oldestLastVisitAt: '2026-08-20T12:00:00Z' },
    nearReward: { total: 2 },
    rewardReady: { total: 1 },
    totalCustomers: 50,
    comparison: {
      week: {
        newCustomers: { current: 2, previous: 1 },
        visits: { current: 10, previous: 8 },
        purchases: { current: 5, previous: 4 },
        redemptions: { current: 1, previous: 0 },
      },
      month: {
        newCustomers: { current: 8, previous: 5 },
        visits: { current: 40, previous: 30 },
        purchases: { current: 20, previous: 15 },
        redemptions: { current: 6, previous: 4 },
      },
      last30: {
        newCustomers: { current: 9, previous: 6 },
        visits: { current: 45, previous: 35 },
        purchases: { current: 22, previous: 18 },
        redemptions: { current: 7, previous: 5 },
      },
    },
    activity: [],
    ...overrides,
  }
}

function program(overrides: Partial<Program> = {}): Program {
  return {
    id: 'prg_1' as ProgramId,
    shopId: 'shp_1' as ShopId,
    reward: { title: 'Corte grátis' },
    rules: { mode: 'stamps', target: 10 },
    bonusRules: {
      birthdayMultiplier: { enabled: true, multiplier: 2 },
      welcomeBonus: { enabled: true, units: 1 },
      referralBonus: { enabled: true, units: 2 },
      surpriseDay: { enabled: true, multiplier: 2, date: '2026-10-20' },
    },
    expirationPolicy: { kind: 'never' },
    checkIn: { enabled: true, cooldownHours: 24, cooldownMode: 'calendarDay' },
    ...overrides,
  }
}

describe('toHomeIndicatorModels', () => {
  it('separates 7-day active customers from monthly new customers and monthly redemptions diff', () => {
    const now = new Date('2026-10-02T15:00:00Z')
    const cards = toHomeIndicatorModels(week({ customers: 12 }), overview(), now, t)

    expect(cards.map((c) => c.id)).toEqual([
      'activeCustomers',
      'lapsedCustomers',
      'deliveredRewards',
      'nearReward',
    ])

    expect(cards[0]?.value).toBe('12')
    expect(cards[0]?.subtitle).toBe('home.indicators.activeThisWeek total=50')
    expect(cards[0]?.badge?.text).toBe('+8')
    expect(cards[0]?.badge?.label).toBe('home.indicators.thisMonth')

    // Redemptions card uses month.redemptions.current (6) and diff vs previous (6 - 4 = +2)
    expect(cards[2]?.value).toBe('6')
    expect(cards[2]?.subtitle).toBe('home.indicators.thisMonth')
    expect(cards[2]?.badge?.text).toBe('+2')
    expect(cards[2]?.badge?.label).toBe('home.indicators.vsLastMonth')
    expect(cards[2]?.badge?.tone).toBe('success')
  })

  it('shows negative or neutral badge when monthly redemptions decrease or stay equal', () => {
    const now = new Date('2026-10-02T15:00:00Z')
    const base = overview()
    const decreased = toHomeIndicatorModels(
      week(),
      overview({
        comparison: {
          ...base.comparison,
          month: { ...base.comparison.month, redemptions: { current: 2, previous: 5 } },
        },
      }),
      now,
      t,
    )
    expect(decreased[2]?.badge?.text).toBe('-3')
    expect(decreased[2]?.badge?.tone).toBe('error')
  })
})

describe('toHomeActivityModels', () => {
  it('maps activity rows using i18n keys for relative time and pluralized units', () => {
    const now = new Date('2026-10-02T15:00:00Z')
    const rows = toHomeActivityModels(
      [
        {
          id: 'act_1',
          kind: 'rewardReleased',
          customerId: 'cus_1' as CustomerId,
          name: 'Ana Paula',
          maskedPhone: MaskedPhoneSchema.parse('(67) 9••••-1111'),
          units: 10,
          unit: 'stamp',
          amountCents: null,
          rewardTitle: 'Café',
          createdAt: '2026-10-02T14:45:00Z',
        },
      ],
      now,
      t,
    )

    expect(rows).toHaveLength(1)
    expect(rows[0]?.initials).toBe('AP')
    expect(rows[0]?.label).toBe('home.recentActivity.events.rewardReleased reward=Café')
    expect(rows[0]?.sub).toBe('home.recentActivity.unitsReached units=units.stamp count=10 #10 #10')
    expect(rows[0]?.relativeTime).toBe('home.recentActivity.time.minutesAgo count=15 #15')
  })
})

describe('toHomeActiveCampaignModels', () => {
  it('uses program unit and multiplier for bonus rules and includes latest sent campaign', () => {
    const campaignsOverview: CampaignOverview = {
      unit: 'stamp',
      bonusLimits: { min: 0, max: 5, suggested: 1 },
      reach: { lapsed: 4, withoutConsent: 1, expired: 0, alreadyReminded: 0, reachable: 3 },
      history: [
        {
          id: 'cmp_1' as CampaignId,
          shopId: 'shp_1' as ShopId,
          kind: 'lapsedReminder',
          unit: 'stamp',
          message: 'Sentimos sua falta',
          bonusUnits: 1,
          recipientsCount: 3,
          sentAt: '2026-10-01T14:00:00Z',
        },
      ],
    }

    const items = toHomeActiveCampaignModels(program(), campaignsOverview, true, t)
    expect(items.map((i) => i.id)).toEqual(['birthday', 'welcome', 'referral', 'surprise', 'lapsedReminder'])
    expect(items[0]?.description).toBe('home.activeCampaigns.birthdayDesc multiplier=2 unit=units.stampNoun #2')
    expect(items[3]?.description).toBe('home.activeCampaigns.surpriseDesc multiplier=2 unit=units.stampNoun #2')
    expect(items[4]?.description).toContain('home.activeCampaigns.lapsedReminderDesc count=3')
  })
})

describe('toHomeComparisonModels & toHomeOpportunityModels', () => {
  it('maps comparison bars with localized titles and pluralized opportunity alerts', () => {
    const bars = toHomeComparisonModels(overview().comparison, t)
    expect(bars.month).toHaveLength(4)
    expect(bars.month[0]?.currentTitle).toContain('home.monthSummary.barTitle')

    const alerts = toHomeOpportunityModels(overview({ lapsed: { total: 1, oldestLastVisitAt: null } }), t)
    expect(alerts[0]?.title).toBe('home.opportunities.lapsedAlert count=1 days=30 #1')
    expect(alerts[2]?.title).toBe('home.opportunities.readyRewardAlert count=1 #1')
  })

  it('formats the dashboard header date with uppercase initial', () => {
    const formatted = formatDashboardDate(new Date('2026-10-02T15:00:00Z'))
    expect(formatted.charAt(0)).toBe(formatted.charAt(0).toUpperCase())
  })
})

describe('customer filter query', () => {
  it('round-trips the filter through a pt-BR slug and falls back to all', () => {
    expect(customerFilterFromSlug(customerFilterSlug('lapsed'))).toBe('lapsed')
    expect(customerFilterSlug('lapsed')).toBe('sumidos')
    expect(customerFilterFromSlug('qualquer')).toBe('all')
    expect(customerFilterFromSlug(undefined)).toBe('all')
  })
})
