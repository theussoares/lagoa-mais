import { createHash } from 'node:crypto'
import type { AuthOutcome, TokenPair } from '../types/auth'

/**
 * Quanto tempo um refresh já feito fica valendo para pedidos com o mesmo refresh token antigo.
 * Precisa ficar SEMPRE <= `refresh_token_reuse_interval` do Supabase (10 s em supabase/config.toml): passar disso
 * entregaria tokens que o próprio provedor já recusaria. Tem folga para o relógio começar antes do refresh terminar.
 */
export const REFRESH_REUSE_WINDOW_MS = 8_000
const MAX_SETTLED_ENTRIES = 500

interface Entry {
  readonly outcome: Promise<AuthOutcome<TokenPair>>
  settled: boolean
  expiresAt: number
  /** Chave do refresh token novo que este refresh devolveu, para o `forget` achar o cache pelo token atual. */
  resultKey: string | undefined
}

const keyOf = (refreshToken: string): string => createHash('sha256').update(refreshToken).digest('hex')

/**
 * O refresh token do Supabase rota a cada uso. Pedidos paralelos com o mesmo token (SSR com várias consultas, SPA que
 * dispara várias chamadas quando o `lagoa_at` venceu) não podem cada um gastá-lo: o perdedor tomaria 400 e derrubaria
 * a sessão. Aqui o primeiro chama o provedor e os demais da mesma instância recebem o mesmo resultado.
 * Só sucesso fica guardado (falha refaz o pedido). As chaves são hash: o token nunca é chave de nada em memória.
 */
export class RefreshCoalescer {
  private readonly entries = new Map<string, Entry>()

  constructor(private readonly now: () => number = Date.now) {}

  refresh(refreshToken: string, run: (token: string) => Promise<AuthOutcome<TokenPair>>): Promise<AuthOutcome<TokenPair>> {
    this.evict()
    const key = keyOf(refreshToken)
    const current = this.entries.get(key)
    if (current !== undefined) return current.outcome
    const entry: Entry = { outcome: run(refreshToken), settled: false, expiresAt: Number.POSITIVE_INFINITY, resultKey: undefined }
    this.entries.set(key, entry)
    void entry.outcome.then(
      (result) => {
        if (!result.ok) return void this.entries.delete(key)
        entry.settled = true
        entry.expiresAt = this.now() + REFRESH_REUSE_WINDOW_MS
        entry.resultKey = keyOf(result.value.refreshToken)
      },
      () => void this.entries.delete(key),
    )
    return entry.outcome
  }

  /** Logout: esquece o que foi guardado para este refresh token (o antigo ou o que o refresh devolveu). */
  forget(refreshToken: string): void {
    const key = keyOf(refreshToken)
    this.entries.delete(key)
    for (const [entryKey, entry] of this.entries) if (entry.resultKey === key) this.entries.delete(entryKey)
  }

  private evict(): void {
    const now = this.now()
    let settled = 0
    for (const [key, entry] of this.entries) {
      if (!entry.settled) continue
      if (entry.expiresAt <= now) this.entries.delete(key)
      else settled += 1
    }
    if (settled < MAX_SETTLED_ENTRIES) return
    for (const [key, entry] of this.entries) {
      if (!entry.settled) continue
      this.entries.delete(key)
      return
    }
  }
}
