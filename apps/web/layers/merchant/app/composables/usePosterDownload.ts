import type { CheckInPosterModel } from '../types/poster'

/** "Baixar QR": entrega o QR do cartaz como PNG e avisa se o aparelho não deixou. */
export function usePosterDownload(poster: Ref<CheckInPosterModel | null>): { download: () => Promise<void> } {
  const { t } = useI18n()
  const { savePng } = useQrDownload()
  const toast = useToast()

  async function download(): Promise<void> {
    if (poster.value === null) return
    const saved = await savePng(`${t('poster.fileName')}.png`, poster.value.qr)
    if (!saved) toast.add({ color: 'error', icon: 'i-ph-warning-circle', title: t('poster.downloadError') })
  }

  return { download }
}
