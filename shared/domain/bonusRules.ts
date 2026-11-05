import type { Birthday, IsoDate } from '../schemas/common'
import type { BonusRules, ProgramRules } from '../schemas/program'
import { BONUS_UNITS_MAX } from '../constants/domain'
import { unitOf } from './programStrategies'

export interface EarnContext {
  readonly today: { readonly isoDate: IsoDate; readonly monthDay: string }
  readonly customerBirthday: Birthday | null
}

/** Regra bônus que multiplica as unidades de uma visita. */
interface MultiplierRule {
  applies(rules: BonusRules, context: EarnContext): boolean
  multiplier(rules: BonusRules): number
}

const MULTIPLIER_RULE_NAMES = ['birthdayMultiplier', 'surpriseDay'] as const
export type AppliedBonus = (typeof MULTIPLIER_RULE_NAMES)[number]

const LEAP_DAY = '02-29'
const LEAP_DAY_FALLBACK = '02-28'

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
}

/** Quem nasceu em 29/02 comemora em 28/02 nos anos sem 29. */
export function isBirthdayToday(birthday: Birthday | null, today: EarnContext['today']): boolean {
  if (birthday === null) return false
  if (birthday === today.monthDay) return true
  return birthday === LEAP_DAY && today.monthDay === LEAP_DAY_FALLBACK && !isLeapYear(Number(today.isoDate.slice(0, 4)))
}

/** Dia surpresa ligado e marcado para `isoDate` (data local do piloto). */
export function isSurpriseDay(rules: BonusRules, isoDate: IsoDate): boolean {
  return rules.surpriseDay.enabled && rules.surpriseDay.date === isoDate
}

/**
 * O dia surpresa é da loja, não da versão do cartão: ligar ou desligar vale na hora para todo cartão, mesmo o que
 * segue numa versão anterior do programa. As demais regras bônus continuam as da versão do cartão.
 */
export function withActiveSurpriseDay(cardRules: BonusRules, activeSurpriseDay: BonusRules['surpriseDay']): BonusRules {
  return { ...cardRules, surpriseDay: activeSurpriseDay }
}

const multiplierRules: Readonly<Record<AppliedBonus, MultiplierRule>> = {
  birthdayMultiplier: {
    applies: (rules, context) =>
      rules.birthdayMultiplier.enabled && isBirthdayToday(context.customerBirthday, context.today),
    multiplier: (rules) => rules.birthdayMultiplier.multiplier,
  },
  surpriseDay: {
    applies: (rules, context) => isSurpriseDay(rules, context.today.isoDate),
    multiplier: (rules) => rules.surpriseDay.multiplier,
  },
}

/**
 * Bônus não se acumulam entre si: vale o maior multiplicador do dia
 * (aniversário no dia surpresa continua em dobro, não quádruplo).
 */
export function applyVisitBonuses(
  baseUnits: number,
  rules: BonusRules,
  context: EarnContext,
): { units: number; applied: AppliedBonus[] } {
  const applied = MULTIPLIER_RULE_NAMES.filter((name) =>
    multiplierRules[name].applies(rules, context),
  )
  const multiplier = Math.max(1, ...applied.map((name) => multiplierRules[name].multiplier(rules)))
  return { units: baseUnits * multiplier, applied }
}

export function welcomeUnits(rules: BonusRules): number {
  return rules.welcomeBonus.enabled ? rules.welcomeBonus.units : 0
}

/**
 * Teto de unidades de um bônus fixo (boas-vindas, indicação). Carimbo: 10, já que o cartão tem no máximo 20.
 * Ponto: acompanha a meta (até `meta - 1`), senão 10 pontos de uma meta de 100 não serviriam de bônus. Nunca abaixo de 10,
 * para não recusar programa salvo com meta pequena.
 */
export function bonusUnitsMax(rules: ProgramRules): number {
  return unitOf(rules) === 'stamp' ? BONUS_UNITS_MAX : Math.max(BONUS_UNITS_MAX, rules.target - 1)
}

/** Boas-vindas também precisam deixar pelo menos uma visita até o prêmio. */
export function welcomeUnitsMax(rules: ProgramRules): number {
  return Math.max(1, Math.min(bonusUnitsMax(rules), rules.target - 1))
}
