import { POSTAL_CODE_LENGTH } from '#shared/constants/domain'

const MASK_SPLIT = 5

/** Só os dígitos, até o tamanho do CEP: o que o lojista cola ou digita vira sempre o mesmo valor. */
export function postalCodeDigits(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, POSTAL_CODE_LENGTH)
}

/** 00000-000 (o hífen só aparece quando há dígito depois dele). */
export function maskPostalCode(raw: string): string {
  const digits = postalCodeDigits(raw)
  return digits.length <= MASK_SPLIT ? digits : `${digits.slice(0, MASK_SPLIT)}-${digits.slice(MASK_SPLIT)}`
}

export function isCompletePostalCode(digits: string): boolean {
  return digits.length === POSTAL_CODE_LENGTH
}
