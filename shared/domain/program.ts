import type { BonusRules, Program, ProgramDraft } from '../schemas/program'

/** O dia surpresa vale para todos os cartões da loja (`withActiveSurpriseDay`): mudá-lo não pede versão nova. */
function withoutSurpriseDay(rules: BonusRules): Omit<BonusRules, 'surpriseDay'> {
  const { surpriseDay: _surpriseDay, ...rest } = rules
  return rest
}

/**
 * Compara a versão ativa com o rascunho. Mudança de regra que afeta quanto o cliente ganha (ou quando vence)
 * não é "a mesma versão": quem decide criar versão nova é o servidor, e o mock usa esta mesma função.
 * O título do prêmio e o dia surpresa ficam de fora: não mudam o que já está em cartão (o dia surpresa é lido da versão ativa).
 */
export function isSameProgram(current: Program, draft: ProgramDraft): boolean {
  if (current.rules.mode !== draft.rules.mode) return false
  if (current.rules.target !== draft.rules.target) return false

  if (current.rules.mode === 'pointsPerVisit' && draft.rules.mode === 'pointsPerVisit') {
    if (current.rules.pointsPerVisit !== draft.rules.pointsPerVisit) return false
  }

  if (current.rules.mode === 'pointsPerCurrency' && draft.rules.mode === 'pointsPerCurrency') {
    if (current.rules.pointsPerReal !== draft.rules.pointsPerReal) return false
  }

  if (JSON.stringify(withoutSurpriseDay(current.bonusRules)) !== JSON.stringify(withoutSurpriseDay(draft.bonusRules))) return false

  if (current.expirationPolicy.kind !== draft.expirationPolicy.kind) return false

  if (
    current.expirationPolicy.kind === 'afterInactivity' &&
    draft.expirationPolicy.kind === 'afterInactivity' &&
    current.expirationPolicy.months !== draft.expirationPolicy.months
  ) {
    return false
  }

  if (
    current.checkIn.enabled !== draft.checkIn.enabled ||
    current.checkIn.cooldownHours !== draft.checkIn.cooldownHours ||
    current.checkIn.cooldownMode !== draft.checkIn.cooldownMode
  ) {
    return false
  }

  return true
}
