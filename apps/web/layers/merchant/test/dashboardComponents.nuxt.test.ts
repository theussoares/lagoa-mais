import { afterEach, describe, expect, it } from 'vitest'
import { useNuxtApp } from '#imports'
import type { CustomerId, ProgramId, ShopId } from '#shared/schemas/ids'
import { MaskedPhoneSchema } from '#shared/schemas/phone'
import type { Program } from '#shared/schemas/program'
import type { WeekSummary } from '#shared/schemas/weekSummary'
import type { HomeOverview } from '#shared/schemas/homeOverview'
import type { Translate } from '#layers/core/app/types/i18n'
import { mountComponent, unmountAll } from '#layers/core/test/componentHarness.nuxt'
import DashboardHeader from '../app/components/home/DashboardHeader.vue'
import IndicatorCards from '../app/components/home/IndicatorCards.vue'
import RecentActivity from '../app/components/home/RecentActivity.vue'
import ActiveCampaigns from '../app/components/home/ActiveCampaigns.vue'
import ComparisonChart from '../app/components/home/ComparisonChart.vue'
import Opportunities from '../app/components/home/Opportunities.vue'
import MobileHeader from '../app/components/navigation/MobileHeader.vue'
import MobileNav from '../app/components/navigation/MobileNav.vue'
import {
  toHomeActiveCampaignModels,
  toHomeActivityModels,
  toHomeComparisonModels,
  toHomeIndicatorModels,
  toHomeOpportunityModels,
} from '../app/utils/homeModels'

afterEach(unmountAll)

const t: Translate = (key, named, plural) => {
  const i18n = useNuxtApp().$i18n
  if (plural !== undefined && named) return i18n.t(key, named, plural)
  if (plural !== undefined) return i18n.t(key, plural)
  if (named) return i18n.t(key, named)
  return i18n.t(key)
}

function translate(): Translate {
  return t
}

function mockWeek(overrides: Partial<WeekSummary> = {}): WeekSummary {
  const days = ['2026-10-09', '2026-10-10', '2026-10-11', '2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15'].map((isoDate, index) => ({
    isoDate,
    visits: (index + 1) * 2,
    newCustomers: 1,
    redemptions: index === 6 ? 2 : 0,
    amountCents: (index + 1) * 1000,
  }))
  return {
    days,
    visits: 28,
    customers: 15,
    newCustomers: 7,
    redemptions: 2,
    amountCents: 28000,
    ...overrides,
  }
}

function mockOverview(overrides: Partial<HomeOverview> = {}): HomeOverview {
  return {
    lapsed: { total: 12, oldestLastVisitAt: '2026-08-15T10:00:00Z' },
    nearReward: { total: 5 },
    rewardReady: { total: 3 },
    totalCustomers: 85,
    comparison: {
      week: {
        newCustomers: { current: 5, previous: 3 },
        visits: { current: 28, previous: 20 },
        purchases: { current: 18, previous: 15 },
        redemptions: { current: 2, previous: 1 },
      },
      month: {
        newCustomers: { current: 20, previous: 15 },
        visits: { current: 90, previous: 80 },
        purchases: { current: 60, previous: 50 },
        redemptions: { current: 8, previous: 5 },
      },
      last30: {
        newCustomers: { current: 25, previous: 20 },
        visits: { current: 120, previous: 100 },
        purchases: { current: 80, previous: 70 },
        redemptions: { current: 10, previous: 7 },
      },
    },
    activity: [
      {
        id: '1',
        kind: 'visit',
        customerId: 'cus_1' as CustomerId,
        name: 'Carlos Silva',
        maskedPhone: MaskedPhoneSchema.parse('(67) 9••••-0871'),
        units: 1,
        unit: 'stamp',
        amountCents: null,
        rewardTitle: null,
        createdAt: '2026-10-19T10:00:00Z',
      },
      {
        id: '2',
        kind: 'purchase',
        customerId: 'cus_2' as CustomerId,
        name: 'Maria Souza',
        maskedPhone: MaskedPhoneSchema.parse('(67) 9••••-1234'),
        units: 2,
        unit: 'stamp',
        amountCents: 4500,
        rewardTitle: null,
        createdAt: '2026-10-19T09:30:00Z',
      },
    ],
    ...overrides,
  }
}

function mockProgram(overrides: Partial<Program> = {}): Program {
  return {
    id: 'prg_test' as ProgramId,
    shopId: 'shp_test' as ShopId,
    reward: { title: 'Corte de cabelo + Barba' },
    rules: { mode: 'pointsPerCurrency', pointsPerReal: 1, target: 120 },
    bonusRules: {
      birthdayMultiplier: { enabled: true, multiplier: 2 },
      welcomeBonus: { enabled: true, units: 10 },
      referralBonus: { enabled: false, units: 5 },
      surpriseDay: { enabled: false, multiplier: 2, date: null },
    },
    expirationPolicy: { kind: 'never' },
    checkIn: { enabled: true, cooldownHours: 24, cooldownMode: 'calendarDay' },
    ...overrides,
  }
}

describe('HomeDashboardHeader', () => {
  it('renders title, subtitle, shop name, counter action and emits refresh', async () => {
    const page = await mountComponent(DashboardHeader, {
      shopName: 'Caju Barbearia',
      dateText: 'Segunda-feira, 19 de outubro',
      loading: false,
    })

    expect(page.text()).toContain('Início')
    expect(page.text()).toContain('Caju Barbearia')
    expect(page.text()).toContain('Segunda-feira, 19 de outubro')
    expect(page.text()).toContain('Ir para o Balcão')

    const refreshBtn = page.get('button[aria-label="Atualizar o Início"]')
    await refreshBtn.trigger('click')
    expect(page.emitted('refresh')).toHaveLength(1)
  })
})

describe('HomeIndicatorCards', () => {
  it('renders 4 metric cards with 7-day active customers and monthly redemptions diff', async () => {
    const week = mockWeek({ customers: 87 })
    const overview = mockOverview({
      lapsed: { total: 14, oldestLastVisitAt: '2026-08-10T10:00:00Z' },
      nearReward: { total: 6 },
      totalCustomers: 120,
    })

    const page = await mountComponent(IndicatorCards, {
      cards: toHomeIndicatorModels(week, overview, new Date('2026-10-19T12:00:00Z'), translate()),
    })

    expect(page.text()).toContain('Clientes ativos')
    expect(page.text()).toContain('87')
    expect(page.text()).toContain('nos últimos 7 dias · de 120 cadastrados')

    expect(page.text()).toContain('Clientes sumidos')
    expect(page.text()).toContain('14')
    expect(page.text()).toContain('Detalhes')

    expect(page.text()).toContain('Prêmios entregues')
    expect(page.text()).toContain('8')
    expect(page.text()).toContain('+3')
    expect(page.text()).toContain('vs. mês anterior')

    expect(page.text()).toContain('Perto do prêmio')
    expect(page.text()).toContain('6')
  })
})

describe('HomeComparisonChart', () => {
  it('renders comparison title, accessible period tabs and metric values', async () => {
    const overview = mockOverview()

    const page = await mountComponent(ComparisonChart, {
      comparison: toHomeComparisonModels(overview.comparison, translate()),
    })

    expect(page.text()).toContain('Resumo do mês')
    const tabs = page.findAll('[role="tab"]')
    expect(tabs).toHaveLength(3)
    expect(tabs[1]?.attributes('aria-selected')).toBe('true')

    expect(page.text()).toContain('Cadastrados')
    expect(page.text()).toContain('Visitas')
    expect(page.text()).toContain('Compras')
    expect(page.text()).toContain('Resgates')
  })
})

describe('HomeOpportunities', () => {
  it('renders actionable opportunity alerts with singular and plural forms', async () => {
    const overview = mockOverview({
      lapsed: { total: 1, oldestLastVisitAt: null },
      nearReward: { total: 5 },
      rewardReady: { total: 1 },
    })

    const page = await mountComponent(Opportunities, {
      alerts: toHomeOpportunityModels(overview, translate()),
    })

    expect(page.text()).toContain('Resumo de oportunidades')
    expect(page.text()).toContain('1 cliente sumido há mais de 30 dias')
    expect(page.text()).toContain('5 clientes próximos de ganhar um prêmio')
    expect(page.text()).toContain('1 prêmio disponível para resgate')
  })

  it('renders empty state when there are no alerts', async () => {
    const overview = mockOverview({
      lapsed: { total: 0, oldestLastVisitAt: null },
      nearReward: { total: 0 },
      rewardReady: { total: 0 },
    })

    const page = await mountComponent(Opportunities, {
      alerts: toHomeOpportunityModels(overview, translate()),
    })

    expect(page.text()).toContain('Tudo em dia por aqui!')
  })
})

describe('HomeRecentActivity', () => {
  it('displays activity list with customer name and event details', async () => {
    const overview = mockOverview()

    const page = await mountComponent(RecentActivity, {
      rows: toHomeActivityModels(overview.activity, new Date('2026-10-19T10:15:00Z'), translate()),
    })

    expect(page.text()).toContain('Atividade recente do clube')
    expect(page.text()).toContain('Carlos Silva')
    expect(page.text()).toContain('Visita registrada')
    expect(page.text()).toContain('Há 15 min')
    expect(page.text()).toContain('Maria Souza')
    expect(page.text()).toContain('Compra lançada')
    expect(page.text()).toContain('45,00')
  })

  it('renders empty state when activity is empty', async () => {
    const page = await mountComponent(RecentActivity, {
      rows: [],
    })

    expect(page.text()).toContain('Nenhuma atividade registrada ainda.')
  })
})

describe('HomeActiveCampaigns', () => {
  it('displays birthday and welcome bonus campaigns with accurate day rule', async () => {
    const program = mockProgram()
    const page = await mountComponent(ActiveCampaigns, {
      items: toHomeActiveCampaignModels(program, null, false, translate()),
      seeAllTo: '/programa',
    })

    expect(page.text()).toContain('Campanhas ativas')
    expect(page.text()).toContain('Aniversário do clube')
    expect(page.text()).toContain('No dia do aniversário, a visita vale 2× em pontos.')
    expect(page.text()).toContain('Em andamento')
    expect(page.text()).toContain('Boas-vindas')
  })
})

describe('Merchant Mobile Navigation', () => {
  it('renders mobile header with LAGOA+ badge, shop name and theme toggle', async () => {
    const page = await mountComponent(MobileHeader, {
      shopName: 'Barbearia Central',
      themeToggleLabels: {
        switchToLight: 'Mudar para tema claro',
        switchToDark: 'Mudar para tema escuro',
      },
    })

    expect(page.text()).toContain('LAGOA+')
    expect(page.text()).toContain('Barbearia Central')
  })

  it('renders mobile bottom navigation with primary tabs and prominent Counter button', async () => {
    const page = await mountComponent(MobileNav, {
      items: [
        { label: 'Início', icon: 'i-ph-house', to: '/painel' },
        { label: 'Balcão', icon: 'i-ph-storefront', to: '/balcao' },
        { label: 'Clientes', icon: 'i-ph-users', to: '/clientes' },
        { label: 'Programa e prêmios', icon: 'i-ph-seal', to: '/programa' },
        { label: 'Hits', icon: 'i-ph-fire', to: '/hits' },
      ],
      footerItems: [{ label: 'Configurações', icon: 'i-ph-gear-six', to: '/configuracoes' }],
      currentPath: '/balcao',
      shopName: 'Barbearia Central',
    })

    expect(page.text()).toContain('Início')
    expect(page.text()).toContain('Balcão')
    expect(page.text()).toContain('Clientes')
    expect(page.text()).toContain('Programa')
    expect(page.text()).toContain('Menu')

    const activeLink = page.get('a[aria-current="page"]')
    expect(activeLink.attributes('href')).toBe('/balcao')
  })
})
