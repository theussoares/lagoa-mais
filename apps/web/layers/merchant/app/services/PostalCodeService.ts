import type { PostalCodeAddress } from '#shared/schemas/postalCode'
import type { ErrorOf, TransportError } from '#shared/types/errors'
import type { Result } from '#shared/types/result'

export type PostalCodeError = ErrorOf<'notFound'> | TransportError

/** Endereço sugerido por um CEP (só dígitos). A consulta externa acontece no BFF, nunca no navegador. */
export interface PostalCodeService {
  lookup(code: string): Promise<Result<PostalCodeAddress, PostalCodeError>>
}
