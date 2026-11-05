/** Sessão do admin dura um dia de trabalho, contado do login: depois, senha e código de novo, por mais que renove. */
export const ADMIN_SESSION_MAX_SECONDS = 60 * 60 * 12

/** Segundos que faltam da sessão; `null` (token sem hora de login) = já acabou. */
export function sessionSecondsLeft(signedInAt: number | null, now: Date): number {
  if (signedInAt === null) return 0
  return Math.max(0, Math.floor(signedInAt + ADMIN_SESSION_MAX_SECONDS - now.getTime() / 1000))
}
