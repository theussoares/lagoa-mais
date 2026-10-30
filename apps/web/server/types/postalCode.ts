import type { PostalCodeAddress } from '#shared/schemas/postalCode'

export type PostalCodeLookup = { status: 'found'; address: PostalCodeAddress } | { status: 'notFound' } | { status: 'unavailable' }
