import { z } from 'zod'
import { SHOP_ADDRESS_MAX_LENGTH } from '#shared/constants/domain'
import { type PostalCodeAddress, PostalCodeAddressSchema } from '#shared/schemas/postalCode'
import type { PostalCodeLookup } from '../types/postalCode'

const VIACEP_BASE_URL = 'https://viacep.com.br/ws'
const LOOKUP_TIMEOUT_MS = 3000
const RESPONSE_MAX_CHARS = 4096
const SEPARATOR = ' — '

const textOrEmpty = z.string().trim().catch('')

const ViaCepSchema = z.object({
  logradouro: textOrEmpty,
  bairro: textOrEmpty,
  localidade: textOrEmpty,
  uf: textOrEmpty,
})

const nonEmpty = (part: string): boolean => part !== ''

/** "Rua X, Bairro — Cidade/UF"; CEP de cidade pequena não traz rua, então sobra só "Cidade/UF". */
export function parseViaCep(raw: unknown): PostalCodeAddress | null {
  const parsed = ViaCepSchema.safeParse(raw)
  if (!parsed.success) return null
  const { logradouro, bairro, localidade, uf } = parsed.data
  const place = [logradouro, bairro].filter(nonEmpty).join(', ')
  const city = [localidade, uf].filter(nonEmpty).join('/')
  const addressLine = [place, city].filter(nonEmpty).join(SEPARATOR).slice(0, SHOP_ADDRESS_MAX_LENGTH).trim()
  const address = PostalCodeAddressSchema.safeParse({ addressLine })
  return address.success ? address.data : null
}

/** O ViaCEP responde 200 com `{ "erro": true }` (ou "true") para CEP que não existe. */
function isNotFound(raw: unknown): boolean {
  return typeof raw === 'object' && raw !== null && 'erro' in raw
}

/**
 * Consulta o ViaCEP pelo servidor (o navegador não fala com ele: CSP). O CEP já chega validado em 8 dígitos;
 * qualquer falha de rede, status ou formato vira `unavailable`, que a tela trata como "preencha à mão".
 */
export async function lookupPostalCode(code: string, fetcher: typeof fetch = fetch): Promise<PostalCodeLookup> {
  const response = await fetcher(`${VIACEP_BASE_URL}/${code}/json/`, {
    headers: { accept: 'application/json' },
    redirect: 'error',
    signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS),
  }).catch(() => null)
  if (response === null) return { status: 'unavailable' }
  if (response.status === 400) return { status: 'notFound' }
  if (!response.ok) return { status: 'unavailable' }
  const text = await response.text().catch(() => '')
  if (text === '' || text.length > RESPONSE_MAX_CHARS) return { status: 'unavailable' }
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return { status: 'unavailable' }
  }
  if (isNotFound(raw)) return { status: 'notFound' }
  const address = parseViaCep(raw)
  return address === null ? { status: 'notFound' } : { status: 'found', address }
}
