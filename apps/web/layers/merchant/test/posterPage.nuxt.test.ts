import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import { useNuxtApp } from '#imports'
import { barbershopSession } from '#layers/core/test/fixtures'
import { resetWorld, restoreClock } from '#layers/core/test/pageHarness.nuxt'
import PosterPage from '../app/pages/poster.vue'

let wrapper: VueWrapper | undefined

function t(key: string): string {
  return useNuxtApp().$i18n.t(key)
}

async function mountPoster(): Promise<VueWrapper> {
  wrapper = await mountSuspended(PosterPage, { attachTo: document.body })
  await vi.waitFor(() => expect(wrapper?.find('article').exists()).toBe(true))
  await flushPromises()
  return wrapper
}

beforeEach(() => {
  resetWorld({ merchant: barbershopSession })
})

afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
  document.body.innerHTML = ''
  restoreClock()
})

describe('poster page', () => {
  it('shows the current poster of the shop with its QR and typed code, outside the sign-up flow', async () => {
    const page = await mountPoster()
    expect(page.get('h1').text()).toBe(t('merchantPoster.title'))
    expect(page.get('article h2').text().length).toBeGreaterThan(0)
    expect(page.find('article svg[role="img"]').exists()).toBe(true)
  })

  it('offers print and download of the QR at any time', async () => {
    const page = await mountPoster()
    const labels = page.findAll('button').map((button) => button.text())
    expect(labels).toContain(t('merchantPoster.print'))
    expect(labels).toContain(t('merchantPoster.download'))
  })
})
