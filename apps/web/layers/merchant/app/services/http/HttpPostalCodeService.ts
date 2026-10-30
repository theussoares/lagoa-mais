import { allowing, type ApiClient } from '#layers/core/app/services/http/ApiClient'
import { type PostalCodeAddress, PostalCodeAddressSchema } from '#shared/schemas/postalCode'
import type { Result } from '#shared/types/result'
import type { PostalCodeError, PostalCodeService } from '../PostalCodeService'

export class HttpPostalCodeService implements PostalCodeService {
  constructor(private readonly api: ApiClient) {}

  async lookup(code: string): Promise<Result<PostalCodeAddress, PostalCodeError>> {
    return allowing('notFound')(await this.api.get(`/merchant/postal-code/${code}`, PostalCodeAddressSchema))
  }
}
