import type { HomeActivityKind } from '../schemas/homeOverview'
import type { LedgerKind } from '../schemas/visit'

/** Conta como visita em `visitsCount`, `lastVisitAt`, resumo da semana e desafios? Bônus e resgate não são visita. */
const visitKinds: Readonly<Record<LedgerKind, boolean>> = {
  visit: true,
  amount: true,
  checkIn: true,
  redemption: false,
  campaignBonus: false,
  welcomeBonus: false,
  referralBonus: false,
}

/** Aparece na caderneta do Balcão? Presente de campanha não passou pelo balcão. */
const counterKinds: Readonly<Record<LedgerKind, boolean>> = {
  visit: true,
  amount: true,
  checkIn: true,
  redemption: true,
  campaignBonus: false,
  welcomeBonus: false,
  referralBonus: false,
}

export function isVisitKind(kind: LedgerKind): boolean {
  return visitKinds[kind]
}

export function isCounterKind(kind: LedgerKind): boolean {
  return counterKinds[kind]
}

/** Tipo de atividade exibida no Início do lojista a partir de uma linha da caderneta. */
export function homeActivityKindOf(
  kind: LedgerKind,
  amountCents?: number | null,
): Exclude<HomeActivityKind, 'rewardReleased'> {
  if (kind === 'redemption') return 'redemption'
  if (amountCents !== null && amountCents !== undefined && amountCents > 0) return 'purchase'
  if (kind === 'welcomeBonus' || kind === 'referralBonus' || kind === 'campaignBonus') return 'bonus'
  return 'visit'
}
