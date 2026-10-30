import type { AssuranceLevel, MfaStep, TotpFactors } from '../types/auth'

export function mfaStep(aal: AssuranceLevel, factors: TotpFactors): MfaStep {
  if (aal === 'aal2') return 'done'
  return factors.verified.length > 0 ? 'verify' : 'enroll'
}

/**
 * Só a senha (`aal1`) cadastra autenticador numa conta que ainda não tem nenhum. Se já tem, cadastrar outro com a
 * senha seria pular o código: trocar de autenticador exige a sessão completa (`aal2`), em Minha conta.
 */
export function canEnroll(aal: AssuranceLevel, factors: TotpFactors): boolean {
  return aal === 'aal2' || factors.verified.length === 0
}

/**
 * Fator cujo código confirma quem está no teclado antes de mexer na senha ou trocar de autenticador: o já confirmado.
 * Conta sem nenhum (primeiro acesso, link do convite) não tem o que pedir.
 */
export function confirmationFactor(factors: TotpFactors): string | null {
  return factors.verified[0] ?? null
}

/**
 * Qual fator o código digitado confirma. Com só a senha e um autenticador cadastrado, é sempre ele (um fator novo pela
 * metade não serve de atalho). No cadastro, o mais novo pela metade. Com a sessão completa, confirmar um novo troca os
 * antigos (`replaces`).
 */
export function verifyTarget(aal: AssuranceLevel, factors: TotpFactors): { factorId: string; replaces: string[] } | null {
  const [confirmed] = factors.verified
  if (aal === 'aal1' && confirmed !== undefined) return { factorId: confirmed, replaces: [] }
  const newest = factors.pending.at(-1)
  if (newest === undefined) return null
  return { factorId: newest, replaces: aal === 'aal2' ? [...factors.verified] : [] }
}
