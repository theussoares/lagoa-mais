import { getRouterParam, setResponseStatus } from 'h3'
import { PostalCodeSchema } from '#shared/schemas/postalCode'
import { failWith, rejectInput } from '../../../utils/authResponse'
import { lookupPostalCode } from '../../../utils/postalCode'
import { readBffConfig } from '../../../utils/serverConfig'
import { resolveAccessToken } from '../../../utils/sessionAccess'

/** Endereço pelo CEP (ViaCEP no servidor). Só para quem tem sessão; o CEP não é guardado nem registrado. */
export default defineEventHandler(async (event) => {
  const code = PostalCodeSchema.safeParse(getRouterParam(event, 'code'))
  if (!code.success) return rejectInput(event)
  const token = await resolveAccessToken(event, { secure: readBffConfig().secureCookies })
  if (!token.ok) return failWith(event, token.code)
  const lookup = await lookupPostalCode(code.data)
  if (lookup.status === 'found') return lookup.address
  if (lookup.status === 'notFound') {
    setResponseStatus(event, 404)
    return { code: 'notFound', entity: 'shop' }
  }
  return failWith(event, 'network')
})
