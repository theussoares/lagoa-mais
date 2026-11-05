import type { TransportError } from '#shared/types/errors'
import { err, ok } from '#shared/types/result'
import type { Result } from '#shared/types/result'
import type { MerchantHomeSnapshot, MerchantHome } from '../types/home'

export function useMerchantHome(): MerchantHome {
  const { home, campaigns, program: programService, posterReprint: posterReprintService } = useMerchantServices()
  const campaignsEnabled = useCampaignsEnabled()
  const refreshedAt = ref(new Date())

  const { state, reload } = useAsyncResult(async (): Promise<Result<MerchantHomeSnapshot, TransportError>> => {
    refreshedAt.value = new Date()
    const [week, overviewResult, programResult, campaignsResult, reprint] = await Promise.all([
      home.getWeekSummary(),
      home.getOverview(),
      programService.getProgram(),
      campaignsEnabled ? campaigns.getOverview() : Promise.resolve(null),
      posterReprintService.isPending(),
    ])
    if (!week.ok) return week
    if (!overviewResult.ok) return overviewResult

    // Sessão vencida derruba a tela; qualquer outra falha gera aviso para o lojista.
    if (campaignsResult !== null && !campaignsResult.ok && campaignsResult.error.code === 'unauthorized') return err(campaignsResult.error)
    if (programResult !== null && !programResult.ok && programResult.error.code === 'unauthorized') return err(programResult.error)

    const warnings: ('program' | 'campaigns')[] = []
    if (programResult !== null && !programResult.ok) warnings.push('program')
    if (campaignsResult !== null && !campaignsResult.ok) warnings.push('campaigns')

    return ok({
      week: week.value,
      overview: overviewResult.value,
      program: programResult?.ok ? programResult.value : null,
      campaignsOverview: campaignsResult?.ok ? campaignsResult.value : null,
      posterReprintPending: reprint.ok && reprint.value,
      warnings,
    })
  })
  return { state, refreshedAt: readonly(refreshedAt), reload, posterReprint: usePosterReprint(reload) }
}
