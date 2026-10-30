import { z } from 'zod'
import { POSTAL_CODE_LENGTH, SHOP_ADDRESS_MAX_LENGTH } from '../constants/domain'

/** CEP só com dígitos, como vai na rota do BFF e na consulta de endereço. */
export const PostalCodeSchema = z.string().regex(new RegExp(`^\\d{${POSTAL_CODE_LENGTH}}$`))

/** Endereço sugerido por um CEP: "Rua X, Bairro — Cidade/UF"; o lojista completa o número. */
export const PostalCodeAddressSchema = z.object({
  addressLine: z.string().min(1).max(SHOP_ADDRESS_MAX_LENGTH),
})

export type PostalCodeAddress = z.infer<typeof PostalCodeAddressSchema>
