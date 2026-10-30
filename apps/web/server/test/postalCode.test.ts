import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clearPostalCodeCache, lookupPostalCode, parseViaCep, PostalCodeCache } from '../utils/postalCode'

const TRES_LAGOAS = { cep: '79601-000', logradouro: 'Avenida Rosário Congro', bairro: 'Centro', localidade: 'Três Lagoas', uf: 'MS' }

function respond(body: unknown, init: ResponseInit = {}): typeof fetch {
  return vi.fn(() => Promise.resolve(new Response(typeof body === 'string' ? body : JSON.stringify(body), { status: 200, ...init }))) as unknown as typeof fetch
}

beforeEach(() => {
  clearPostalCodeCache()
})

describe('parseViaCep', () => {
  it('builds "street, district — city/state"', () => {
    expect(parseViaCep(TRES_LAGOAS)).toEqual({ addressLine: 'Avenida Rosário Congro, Centro — Três Lagoas/MS' })
  })

  it('skips the parts the postal code does not carry', () => {
    expect(parseViaCep({ ...TRES_LAGOAS, logradouro: '', bairro: '' })).toEqual({ addressLine: 'Três Lagoas/MS' })
    expect(parseViaCep({ ...TRES_LAGOAS, bairro: ' ' })).toEqual({ addressLine: 'Avenida Rosário Congro — Três Lagoas/MS' })
  })

  it('keeps the line within the address limit', () => {
    const parsed = parseViaCep({ ...TRES_LAGOAS, logradouro: 'R'.repeat(300) })
    expect(parsed?.addressLine).toHaveLength(100)
  })

  it('refuses anything that is not an object or has nothing to show', () => {
    expect(parseViaCep(null)).toBeNull()
    expect(parseViaCep('x')).toBeNull()
    expect(parseViaCep({})).toBeNull()
  })

  it('ignores fields of the wrong type instead of printing them', () => {
    expect(parseViaCep({ ...TRES_LAGOAS, bairro: { evil: true } })).toEqual({ addressLine: 'Avenida Rosário Congro — Três Lagoas/MS' })
  })
})

describe('lookupPostalCode', () => {
  it('asks ViaCEP for the digits and returns the address', async () => {
    const fetcher = respond(TRES_LAGOAS)
    expect(await lookupPostalCode('79601000', fetcher)).toEqual({ status: 'found', address: { addressLine: 'Avenida Rosário Congro, Centro — Três Lagoas/MS' } })
    expect(fetcher).toHaveBeenCalledWith('https://viacep.com.br/ws/79601000/json/', expect.objectContaining({ redirect: 'error' }))
  })

  it('reports a postal code that does not exist', async () => {
    expect(await lookupPostalCode('99999999', respond({ erro: true }))).toEqual({ status: 'notFound' })
    expect(await lookupPostalCode('99999999', respond({ erro: 'true' }))).toEqual({ status: 'notFound' })
    expect(await lookupPostalCode('99999999', respond('', { status: 400 }))).toEqual({ status: 'notFound' })
  })

  it('reports unavailable on network failure, server error, bad JSON or huge bodies', async () => {
    expect(await lookupPostalCode('79601000', vi.fn(() => Promise.reject(new Error('boom'))) as unknown as typeof fetch)).toEqual({ status: 'unavailable' })
    expect(await lookupPostalCode('79601000', respond('', { status: 503 }))).toEqual({ status: 'unavailable' })
    expect(await lookupPostalCode('79601000', respond('<html>'))).toEqual({ status: 'unavailable' })
    expect(await lookupPostalCode('79601000', respond(' '.repeat(5000)))).toEqual({ status: 'unavailable' })
  })

  it('serves repeated lookups from cache without calling fetcher again', async () => {
    const cache = new PostalCodeCache()
    const fetcher = respond(TRES_LAGOAS)
    const first = await lookupPostalCode('79601000', fetcher, cache)
    expect(first.status).toBe('found')
    expect(fetcher).toHaveBeenCalledTimes(1)

    const second = await lookupPostalCode('79601000', fetcher, cache)
    expect(second).toEqual(first)
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('does not cache notFound or unavailable responses', async () => {
    const cache = new PostalCodeCache()
    const notFoundFetcher = respond({ erro: true })
    await lookupPostalCode('99999999', notFoundFetcher, cache)
    expect(cache.size()).toBe(0)

    const failFetcher = vi.fn(() => Promise.reject(new Error('fail'))) as unknown as typeof fetch
    await lookupPostalCode('79601000', failFetcher, cache)
    expect(cache.size()).toBe(0)
  })
})

describe('PostalCodeCache', () => {
  it('stores and retrieves found addresses within TTL', () => {
    let now = 1_000
    const cache = new PostalCodeCache(5_000, 10, () => now)
    const address = { addressLine: 'Rua A — Cidade/UF' }
    cache.set('79601000', address)

    expect(cache.get('79601000')).toEqual(address)
    now += 5_001
    expect(cache.get('79601000')).toBeUndefined()
  })

  it('evicts expired entries or oldest when max capacity is reached', () => {
    let now = 1_000
    const cache = new PostalCodeCache(10_000, 2, () => now)
    cache.set('11111111', { addressLine: 'Rua 1' })
    cache.set('22222222', { addressLine: 'Rua 2' })
    cache.set('33333333', { addressLine: 'Rua 3' })

    expect(cache.get('11111111')).toBeUndefined()
    expect(cache.get('22222222')).toEqual({ addressLine: 'Rua 2' })
    expect(cache.get('33333333')).toEqual({ addressLine: 'Rua 3' })
  })
})
