import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { err, ok } from '#shared/types/result'
import { mountComposable } from '#layers/core/test/composableHarness.nuxt'
import type { PostalCodeService } from '../app/services/PostalCodeService'
import { usePostalCodeLookup } from '../app/composables/usePostalCodeLookup'

const { lookup, expire } = vi.hoisted(() => ({ lookup: vi.fn<PostalCodeService['lookup']>(), expire: vi.fn() }))

mockNuxtImport('useMerchantServices', () => () => ({ postalCode: { lookup } }))
mockNuxtImport('useMerchantSession', () => () => ({ expire }))

const ADDRESS = { addressLine: 'Rua X, Centro — Três Lagoas/MS' }

beforeEach(() => {
  lookup.mockReset()
  expire.mockReset()
})

afterEach(() => vi.clearAllMocks())

describe('usePostalCodeLookup', () => {
  it('masks what is typed and does not search before the eighth digit', async () => {
    const onFound = vi.fn()
    const { result } = await mountComposable(() => usePostalCodeLookup(onFound))
    await result.change('79601')
    await result.change('796010')
    expect(result.value.value).toBe('79601-0')
    expect(result.status.value).toBe('idle')
    expect(lookup).not.toHaveBeenCalled()
  })

  it('searches the digits once complete and hands the address line over', async () => {
    lookup.mockResolvedValue(ok(ADDRESS))
    const onFound = vi.fn()
    const { result } = await mountComposable(() => usePostalCodeLookup(onFound))
    await result.change('79601-000')
    expect(lookup).toHaveBeenCalledWith('79601000')
    expect(result.status.value).toBe('found')
    expect(onFound).toHaveBeenCalledWith(ADDRESS.addressLine)
  })

  it('reports an unknown postal code without touching the address', async () => {
    lookup.mockResolvedValue(err({ code: 'notFound', entity: 'shop' }))
    const onFound = vi.fn()
    const { result } = await mountComposable(() => usePostalCodeLookup(onFound))
    await result.change('99999999')
    expect(result.status.value).toBe('notFound')
    expect(onFound).not.toHaveBeenCalled()
  })

  it('reports unavailable on a transport failure, and ends the session on unauthorized', async () => {
    const onFound = vi.fn()
    const { result } = await mountComposable(() => usePostalCodeLookup(onFound))
    lookup.mockResolvedValueOnce(err({ code: 'network' }))
    await result.change('79601000')
    expect(result.status.value).toBe('unavailable')
    lookup.mockResolvedValueOnce(err({ code: 'unauthorized' }))
    await result.change('79601001')
    expect(expire).toHaveBeenCalledOnce()
    expect(onFound).not.toHaveBeenCalled()
  })

  it('ignores a slow answer for a postal code the merchant already edited', async () => {
    let finish: (value: Awaited<ReturnType<PostalCodeService['lookup']>>) => void = () => undefined
    lookup.mockReturnValueOnce(new Promise((resolve) => (finish = resolve)))
    const onFound = vi.fn()
    const { result } = await mountComposable(() => usePostalCodeLookup(onFound))
    const pending = result.change('79601000')
    expect(result.status.value).toBe('loading')
    await result.change('7960')
    finish(ok(ADDRESS))
    await pending
    expect(result.status.value).toBe('idle')
    expect(onFound).not.toHaveBeenCalled()
  })
})
