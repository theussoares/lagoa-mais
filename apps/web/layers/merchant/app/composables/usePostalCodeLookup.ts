import type { PostalCodeLookupControl, PostalCodeStatus } from '../types/postalCode'
import { isCompletePostalCode, maskPostalCode, postalCodeDigits } from '../utils/postalCodeForm'

/**
 * Campo CEP: ao completar os 8 dígitos busca o endereço e entrega a linha pronta a `onFound`.
 * Falha ou CEP desconhecido só muda `status` (aviso discreto): o endereço segue editável à mão e o envio nunca depende disto.
 * O CEP não é guardado: vive só neste composable.
 */
export function usePostalCodeLookup(onFound: (addressLine: string) => void): PostalCodeLookupControl {
  const { postalCode } = useMerchantServices()
  const { expire } = useMerchantSession()
  const value = ref('')
  const status = ref<PostalCodeStatus>('idle')
  let latest = 0

  async function change(raw: string): Promise<void> {
    const digits = postalCodeDigits(raw)
    value.value = maskPostalCode(digits)
    const request = ++latest
    if (!isCompletePostalCode(digits)) {
      status.value = 'idle'
      return
    }
    status.value = 'loading'
    const result = await postalCode.lookup(digits)
    if (request !== latest) return
    if (result.ok) {
      status.value = 'found'
      return onFound(result.value.addressLine)
    }
    if (result.error.code === 'unauthorized') return expire()
    status.value = result.error.code === 'notFound' ? 'notFound' : 'unavailable'
  }

  return { value, status, change }
}
