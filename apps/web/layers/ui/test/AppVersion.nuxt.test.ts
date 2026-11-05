import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import AppVersion from '../app/components/AppVersion.vue'
import { mountComposable } from '../../core/test/composableHarness.nuxt'

describe('AppVersion', () => {
  it('shows the label with a caption for screen readers', async () => {
    const wrapper = await mountSuspended(AppVersion, { props: { label: 'v0.2.2', caption: 'Versão do Lagoa+' } })
    expect(wrapper.text()).toBe('Versão do Lagoa+ v0.2.2')
    expect(wrapper.get('.sr-only').text()).toBe('Versão do Lagoa+')
  })

  it('appends the commit only when given', async () => {
    const wrapper = await mountSuspended(AppVersion, { props: { label: 'v0.2.2', commit: 'd733754', caption: 'Versão' } })
    expect(wrapper.text()).toContain('v0.2.2 · d733754')
  })
})

describe('useAppVersion', () => {
  it('formats the version from runtime config', async () => {
    const { result } = await mountComposable(() => useAppVersion())
    expect(result.label).toBe(`v${result.version}`)
    expect(result.version).toMatch(/^\d+\.\d+\.\d+$/)
  })
})
