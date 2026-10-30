import type { AuthOutcome, TokenPair } from '../types/auth'

/** Cobre a rajada de pedidos de uma mesma página; o Supabase tolera reuso do refresh token por um intervalo parecido. */
export const REFRESH_REUSE_WINDOW_MS = 20_000
const MAX_ENTRIES = 500

interface Entry {
  readonly outcome: Promise<AuthOutcome<TokenPair>>
  readonly expiresAt: number
}

/**
 * O refresh token do Supabase rota a cada uso. Pedidos paralelos com o mesmo token (SSR com várias consultas, SPA que
 * dispara várias chamadas quando o `lagoa_at` venceu) não podem cada um gastá-lo: o perdedor tomaria 400 e derrubaria
 * a sessão. Aqui o primeiro chama o provedor e os demais da mesma instância recebem o mesmo resultado.
 * Só sucesso fica guardado (falha refaz o pedido).
 */
export class RefreshCoalescer {
  private readonly entries = new Map<string, Entry>()

  constructor(private readonly now: () => number = Date.now) {}

  refresh(refreshToken: string, run: (token: string) => Promise<AuthOutcome<TokenPair>>): Promise<AuthOutcome<TokenPair>> {
    this.evict()
    const current = this.entries.get(refreshToken)
    if (current !== undefined) return current.outcome
    const outcome = run(refreshToken)
    this.entries.set(refreshToken, { outcome, expiresAt: this.now() + REFRESH_REUSE_WINDOW_MS })
    void outcome.then(
      (result) => {
        if (!result.ok) this.entries.delete(refreshToken)
      },
      () => this.entries.delete(refreshToken),
    )
    return outcome
  }

  private evict(): void {
    const now = this.now()
    for (const [token, entry] of this.entries) if (entry.expiresAt <= now) this.entries.delete(token)
    if (this.entries.size < MAX_ENTRIES) return
    const oldest = this.entries.keys().next()
    if (!oldest.done) this.entries.delete(oldest.value)
  }
}
