import { LAPSED_AFTER_DAYS } from '#shared/constants/domain'
import { unitOf } from '#shared/domain/programStrategies'
import type { CampaignOverview } from '#shared/schemas/campaign'
import type { HomeActivityItem, HomeMetrics, HomeOverview, HomePeriod } from '#shared/schemas/homeOverview'
import type { Program } from '#shared/schemas/program'
import type { WeekSummary } from '#shared/schemas/weekSummary'
import { formatCurrency, formatInteger } from '#shared/utils/currency'
import { formatLongWeekdayDate, formatNumericDayMonth, formatTime } from '#shared/utils/dateFormat'
import { calendarDaysBetween } from '#shared/utils/time'
import type { Translate } from '#layers/core/app/types/i18n'
import { unitsText } from '#layers/core/app/utils/units'
import type {
  HomeActiveCampaignModel,
  HomeActivityRowModel,
  HomeComparisonBarModel,
  HomeDiffTone,
  HomeIndicatorCardBadge,
  HomeIndicatorCardModel,
  HomeOpportunityModel,
  MerchantHomeSnapshot,
  MerchantHomeViewModel,
} from '../types/home'

const AVATAR_PALETTES = [
  { bg: 'bg-primary/10', text: 'text-primary' },
  { bg: 'bg-secondary/10', text: 'text-secondary' },
  { bg: 'bg-success/10', text: 'text-success' },
  { bg: 'bg-(--color-sol-100) dark:bg-(--color-sol-900)', text: 'text-(--color-sol-700) dark:text-(--color-sol-200)' },
  { bg: 'bg-(--ui-bg-accented)', text: 'text-(--ui-text-toned)' },
] as const

/** Formata a data do cabeçalho do painel no fuso da cidade com inicial maiúscula. */
export function formatDashboardDate(now: Date): string {
  const formatted = formatLongWeekdayDate(now)
  return formatted.charAt(0).toUpperCase() + formatted.slice(1)
}

function buildMonthRedemptionsBadge(current: number, previous: number, t: Translate): HomeIndicatorCardBadge | undefined {
  if (current === 0 && previous === 0) return undefined
  const diff = current - previous
  const tone: HomeDiffTone = diff > 0 ? 'success' : diff < 0 ? 'error' : 'neutral'
  const icon = diff > 0 ? 'i-ph-arrow-up' : diff < 0 ? 'i-ph-arrow-down' : 'i-ph-minus'
  const text = diff > 0 ? `+${formatInteger(diff)}` : formatInteger(diff)
  return {
    text,
    label: t('home.indicators.vsLastMonth'),
    tone,
    icon,
  }
}

/** Mapeia os 4 indicadores principais do Início sem misturar janelas de 7 dias e mensais. */
export function toHomeIndicatorModels(
  week: WeekSummary,
  overview: HomeOverview,
  now: Date,
  t: Translate,
): HomeIndicatorCardModel[] {
  const monthNewCustomers = overview.comparison.month.newCustomers.current
  const monthRedemptions = overview.comparison.month.redemptions

  const lapsedSubtitle =
    overview.lapsed.total === 0
      ? t('home.indicators.noLapsed')
      : overview.lapsed.oldestLastVisitAt
        ? t('home.indicators.oldestLapsed', {
            days: calendarDaysBetween(new Date(overview.lapsed.oldestLastVisitAt), now),
          })
        : t('home.indicators.lapsedDescription', { days: LAPSED_AFTER_DAYS })

  return [
    {
      id: 'activeCustomers',
      icon: 'i-ph-users',
      title: t('home.indicators.activeCustomers'),
      value: formatInteger(week.customers),
      subtitle: t('home.indicators.activeThisWeek', { total: formatInteger(overview.totalCustomers) }),
      badge:
        monthNewCustomers > 0
          ? {
              text: `+${formatInteger(monthNewCustomers)}`,
              label: t('home.indicators.thisMonth'),
              tone: 'success',
              icon: 'i-ph-arrow-up',
            }
          : undefined,
    },
    {
      id: 'lapsedCustomers',
      icon: 'i-ph-user-minus',
      title: t('home.indicators.lapsedCustomers'),
      value: formatInteger(overview.lapsed.total),
      subtitle: lapsedSubtitle,
      action: {
        label: t('home.indicators.seeLapsedAction'),
        to: '/clientes?filtro=sumidos',
      },
    },
    {
      id: 'deliveredRewards',
      icon: 'i-ph-gift',
      title: t('home.indicators.deliveredRewards'),
      value: formatInteger(monthRedemptions.current),
      subtitle: t('home.indicators.thisMonth'),
      badge: buildMonthRedemptionsBadge(monthRedemptions.current, monthRedemptions.previous, t),
    },
    {
      id: 'nearReward',
      icon: 'i-ph-target',
      title: t('home.indicators.nearReward'),
      value: formatInteger(overview.nearReward.total),
      subtitle:
        overview.nearReward.total === 0
          ? t('home.indicators.noNearReward')
          : t('home.indicators.nearRewardDescription'),
      action: {
        label: t('home.indicators.seeNearRewardAction'),
        to: '/clientes?filtro=perto-do-premio',
      },
    },
  ]
}

function getInitials(name: string | null): string {
  if (!name || !name.trim()) return 'CL'
  const parts = name.trim().split(/\s+/).filter(Boolean)
  const first = parts[0]
  if (!first) return 'CL'
  if (parts.length === 1) return first.slice(0, 2).toUpperCase()
  const last = parts[parts.length - 1] ?? first
  return (first.charAt(0) + last.charAt(0)).toUpperCase()
}

export function formatRelativeActivityTime(isoDate: string, now: Date, t: Translate): string {
  const date = new Date(isoDate)
  const diffMinutes = Math.floor((now.getTime() - date.getTime()) / 60_000)

  if (diffMinutes < 1) return t('home.recentActivity.time.justNow')
  if (diffMinutes < 60) return t('home.recentActivity.time.minutesAgo', { count: diffMinutes }, diffMinutes)

  const days = calendarDaysBetween(date, now)
  const time = formatTime(isoDate)

  if (days === 0) return t('home.recentActivity.time.todayAt', { time })
  if (days === 1) return t('home.recentActivity.time.yesterdayAt', { time })
  return t('home.recentActivity.time.dateAt', { date: formatNumericDayMonth(isoDate), time })
}

function resolveActivityEvent(item: HomeActivityItem, t: Translate) {
  const unitLabel = unitsText(t, item.unit, item.units)
  const reward = item.rewardTitle || t('home.recentActivity.defaultReward')

  switch (item.kind) {
    case 'purchase':
      return {
        label: t('home.recentActivity.events.purchase', { amount: formatCurrency(item.amountCents ?? 0) }),
        sub: `+${unitLabel}`,
        icon: 'i-ph-receipt',
        iconColor: 'text-primary',
        to: '/clientes',
      }
    case 'bonus':
      return {
        label: t('home.recentActivity.events.bonus'),
        sub: `+${unitLabel}`,
        icon: 'i-ph-sparkle',
        iconColor: 'text-(--color-sol-700) dark:text-(--color-sol-200)',
        to: '/clientes',
      }
    case 'rewardReleased':
      return {
        label: t('home.recentActivity.events.rewardReleased', { reward }),
        sub: t('home.recentActivity.unitsReached', { units: unitLabel }, item.units),
        icon: 'i-ph-gift',
        iconColor: 'text-secondary',
        to: '/clientes?filtro=premio-liberado',
      }
    case 'redemption':
      return {
        label: t('home.recentActivity.events.redemption', { reward }),
        sub: t('home.recentActivity.deliveredAtCounter'),
        icon: 'i-ph-trophy',
        iconColor: 'text-success',
        to: '/balcao',
      }
    case 'visit':
      return {
        label: t('home.recentActivity.events.visit'),
        sub: `+${unitLabel}`,
        icon: 'i-ph-check-circle',
        iconColor: 'text-primary',
        to: '/clientes',
      }
  }
}

/** Mapeia a lista de atividades recentes com textos, plurais e tempo relativo traduzidos. */
export function toHomeActivityModels(
  activity: readonly HomeActivityItem[],
  now: Date,
  t: Translate,
): HomeActivityRowModel[] {
  return activity.map((item, index) => {
    const palette = AVATAR_PALETTES[index % AVATAR_PALETTES.length] ?? AVATAR_PALETTES[0]
    const details = resolveActivityEvent(item, t)
    return {
      id: item.id,
      initials: getInitials(item.name),
      avatarBg: palette.bg,
      avatarText: palette.text,
      customerName: item.name || t('customers.table.noName'),
      maskedPhone: item.maskedPhone,
      icon: details.icon,
      iconColor: details.iconColor,
      label: details.label,
      sub: details.sub,
      relativeTime: formatRelativeActivityTime(item.createdAt, now, t),
      to: details.to,
    }
  })
}

/** Mapeia as regras de bônus ativas do programa e a última campanha enviada. */
export function toHomeActiveCampaignModels(
  program: Program | null,
  campaignsOverview: CampaignOverview | null,
  campaignsEnabled: boolean,
  t: Translate,
): HomeActiveCampaignModel[] {
  const items: HomeActiveCampaignModel[] = []
  const rules = program?.bonusRules
  const unit = program ? unitOf(program.rules) : 'point'
  const unitPlural = t(`units.${unit}Noun`, {}, 2)

  if (rules?.birthdayMultiplier.enabled) {
    items.push({
      id: 'birthday',
      title: t('home.activeCampaigns.birthdayTitle'),
      description: t('home.activeCampaigns.birthdayDesc', {
        multiplier: rules.birthdayMultiplier.multiplier,
        unit: unitPlural,
      }),
      status: t('home.activeCampaigns.statusOngoing'),
      icon: 'i-ph-gift',
      iconBg: 'bg-primary/10',
      iconColor: 'text-primary',
      badgeBg: 'bg-primary/10',
      badgeColor: 'text-primary',
      to: '/programa',
    })
  }

  if (rules?.welcomeBonus.enabled) {
    items.push({
      id: 'welcome',
      title: t('home.activeCampaigns.welcomeTitle'),
      description: t('home.activeCampaigns.welcomeDesc', {
        units: unitsText(t, unit, rules.welcomeBonus.units),
      }),
      status: t('home.activeCampaigns.statusOngoing'),
      icon: 'i-ph-sparkle',
      iconBg: 'bg-(--color-sol-100) dark:bg-(--color-sol-900)',
      iconColor: 'text-(--color-sol-700) dark:text-(--color-sol-200)',
      badgeBg: 'bg-(--color-sol-100) dark:bg-(--color-sol-900)',
      badgeColor: 'text-(--color-sol-700) dark:text-(--color-sol-200)',
      to: '/programa',
    })
  }

  if (rules?.referralBonus.enabled) {
    items.push({
      id: 'referral',
      title: t('home.activeCampaigns.referralTitle'),
      description: t('home.activeCampaigns.referralDesc', {
        units: unitsText(t, unit, rules.referralBonus.units),
      }),
      status: t('home.activeCampaigns.statusOngoing'),
      icon: 'i-ph-users-three',
      iconBg: 'bg-success/10',
      iconColor: 'text-success',
      badgeBg: 'bg-success/10',
      badgeColor: 'text-success',
      to: '/programa',
    })
  }

  if (rules?.surpriseDay.enabled) {
    items.push({
      id: 'surprise',
      title: t('home.activeCampaigns.surpriseTitle'),
      description: t('home.activeCampaigns.surpriseDesc', {
        multiplier: rules.surpriseDay.multiplier,
        unit: unitPlural,
      }),
      status: t('home.activeCampaigns.statusOngoing'),
      icon: 'i-ph-calendar-star',
      iconBg: 'bg-secondary/10',
      iconColor: 'text-secondary',
      badgeBg: 'bg-secondary/10',
      badgeColor: 'text-secondary',
      to: '/programa',
    })
  }

  const latestCampaign = campaignsEnabled ? campaignsOverview?.history[0] : undefined
  if (latestCampaign) {
    items.push({
      id: 'lapsedReminder',
      title: t('home.activeCampaigns.lapsedReminderTitle'),
      description: t(
        'home.activeCampaigns.lapsedReminderDesc',
        {
          count: latestCampaign.recipientsCount,
          date: formatNumericDayMonth(latestCampaign.sentAt),
        },
        latestCampaign.recipientsCount,
      ),
      status: t('home.activeCampaigns.statusOngoing'),
      icon: 'i-ph-paper-plane-tilt',
      iconBg: 'bg-primary/10',
      iconColor: 'text-primary',
      badgeBg: 'bg-primary/10',
      badgeColor: 'text-primary',
      to: '/campanhas',
    })
  }

  return items
}

function mapPeriodBars(metrics: HomeMetrics, t: Translate): HomeComparisonBarModel[] {
  const raw = [
    {
      id: 'newCustomers' as const,
      label: t('home.monthSummary.metrics.newCustomers'),
      current: metrics.newCustomers.current,
      previous: metrics.newCustomers.previous,
    },
    {
      id: 'visits' as const,
      label: t('home.monthSummary.metrics.visits'),
      current: metrics.visits.current,
      previous: metrics.visits.previous,
    },
    {
      id: 'purchases' as const,
      label: t('home.monthSummary.metrics.purchases'),
      current: metrics.purchases.current,
      previous: metrics.purchases.previous,
    },
    {
      id: 'redemptions' as const,
      label: t('home.monthSummary.metrics.redemptions'),
      current: metrics.redemptions.current,
      previous: metrics.redemptions.previous,
    },
  ]

  const maxValue = Math.max(...raw.flatMap((i) => [i.current, i.previous]), 1)
  const currentPeriodLabel = t('home.monthSummary.current')
  const previousPeriodLabel = t('home.monthSummary.previous')

  return raw.map((item) => {
    let diffPercent: number | null = null
    if (item.previous > 0) {
      diffPercent = Math.round(((item.current - item.previous) / item.previous) * 100)
    } else if (item.current > 0) {
      diffPercent = 100
    }

    const diffTone: HomeDiffTone =
      diffPercent === null || diffPercent === 0 ? 'neutral' : diffPercent > 0 ? 'success' : 'error'
    const diffIcon =
      diffPercent === null || diffPercent === 0 ? 'i-ph-minus' : diffPercent > 0 ? 'i-ph-arrow-up' : 'i-ph-arrow-down'
    const diffText =
      diffPercent === null ? null : diffPercent > 0 ? `+${diffPercent}%` : `${diffPercent}%`

    return {
      ...item,
      currentHeight: item.current === 0 ? 6 : Math.max(10, Math.round((item.current / maxValue) * 100)),
      previousHeight: item.previous === 0 ? 6 : Math.max(10, Math.round((item.previous / maxValue) * 100)),
      diffText,
      diffTone,
      diffIcon,
      currentTitle: t('home.monthSummary.barTitle', {
        metric: item.label,
        period: currentPeriodLabel,
        value: item.current,
      }),
      previousTitle: t('home.monthSummary.barTitle', {
        metric: item.label,
        period: previousPeriodLabel,
        value: item.previous,
      }),
    }
  })
}

/** Mapeia as barras comparativas para cada período do gráfico. */
export function toHomeComparisonModels(
  comparison: Record<HomePeriod, HomeMetrics>,
  t: Translate,
): Record<HomePeriod, HomeComparisonBarModel[]> {
  return {
    week: mapPeriodBars(comparison.week, t),
    month: mapPeriodBars(comparison.month, t),
    last30: mapPeriodBars(comparison.last30, t),
  }
}

/** Mapeia os alertas acionáveis do resumo de oportunidades com plural correto. */
export function toHomeOpportunityModels(overview: HomeOverview, t: Translate): HomeOpportunityModel[] {
  const items: HomeOpportunityModel[] = []

  if (overview.lapsed.total > 0) {
    items.push({
      id: 'lapsed',
      title: t(
        'home.opportunities.lapsedAlert',
        { count: overview.lapsed.total, days: LAPSED_AFTER_DAYS },
        overview.lapsed.total,
      ),
      count: overview.lapsed.total,
      icon: 'i-ph-user-minus',
      iconColor: 'bg-(--ui-error)/10 text-(--ui-error)',
      badgeClass: 'bg-(--ui-error)/10 text-(--ui-error)',
      to: '/clientes?filtro=sumidos',
    })
  }

  if (overview.nearReward.total > 0) {
    items.push({
      id: 'near-reward',
      title: t(
        'home.opportunities.nearRewardAlert',
        { count: overview.nearReward.total },
        overview.nearReward.total,
      ),
      count: overview.nearReward.total,
      icon: 'i-ph-target',
      iconColor: 'bg-(--color-sol-100) dark:bg-(--color-sol-900) text-(--color-sol-700) dark:text-(--color-sol-200)',
      badgeClass: 'bg-(--color-sol-100) dark:bg-(--color-sol-900) text-(--color-sol-700) dark:text-(--color-sol-200)',
      to: '/clientes?filtro=perto-do-premio',
    })
  }

  if (overview.rewardReady.total > 0) {
    items.push({
      id: 'reward-ready',
      title: t(
        'home.opportunities.readyRewardAlert',
        { count: overview.rewardReady.total },
        overview.rewardReady.total,
      ),
      count: overview.rewardReady.total,
      icon: 'i-ph-gift',
      iconColor: 'bg-secondary/10 text-secondary',
      badgeClass: 'bg-secondary/10 text-secondary',
      to: '/clientes?filtro=premio-liberado',
    })
  }

  return items
}

/** Agrega todos os modelos de visualização do painel Início a partir do snapshot. */
export function toMerchantHomeViewModel(
  snapshot: MerchantHomeSnapshot,
  now: Date,
  campaignsEnabled: boolean,
  t: Translate,
): MerchantHomeViewModel {
  return {
    cards: toHomeIndicatorModels(snapshot.week, snapshot.overview, now, t),
    activityRows: toHomeActivityModels(snapshot.overview.activity, now, t),
    activeCampaigns: toHomeActiveCampaignModels(
      snapshot.program,
      snapshot.campaignsOverview,
      campaignsEnabled,
      t,
    ),
    campaignsSeeAllTo: campaignsEnabled ? '/campanhas' : '/programa',
    comparisonBars: toHomeComparisonModels(snapshot.overview.comparison, t),
    opportunities: toHomeOpportunityModels(snapshot.overview, t),
    posterReprintPending: snapshot.posterReprintPending,
    warnings: snapshot.warnings,
  }
}
