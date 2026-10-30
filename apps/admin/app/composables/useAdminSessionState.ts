import type { Ref } from 'vue'
import type { AdminSession } from '#shared/schemas/admin'

/** Sessão conhecida pelo painel (`undefined` = ainda não perguntou ao BFF). Só na memória: quem decide é o cookie. */
export function useAdminSessionState(): Ref<AdminSession | undefined> {
  return useState<AdminSession | undefined>('admin-session', () => undefined)
}
