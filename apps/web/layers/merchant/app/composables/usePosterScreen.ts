import { toCheckInPosterModel } from '../utils/posterModel'
import type { PosterScreen } from '../types/poster'

/** Tela "Cartaz": o cartaz atual da loja, para imprimir ou baixar a qualquer hora (segue o programa de agora). */
export function usePosterScreen(): PosterScreen {
  const { poster: posterService } = useMerchantServices()
  const translate = useTranslate()
  const origin = useCustomerOrigin()
  const { print } = usePrint()
  const { state, reload } = useAsyncResult(() => posterService.getPoster())

  const poster = computed(() => (state.value.status === 'success' ? toCheckInPosterModel(state.value.value, origin, translate) : null))
  const status = computed(() => (state.value.status === 'success' ? 'ready' : state.value.status))
  const { download } = usePosterDownload(poster)

  return reactive({ status, poster, print, download, reload })
}
