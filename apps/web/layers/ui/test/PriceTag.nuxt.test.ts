import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import PriceTag from '../app/components/PriceTag.vue'

describe('PriceTag', () => {
  it('keeps "de" and "por" in their own elements so the gap, not a trailing space, separates them from the prices', async () => {
    const wrapper = await mountSuspended(PriceTag, {
      props: { price: 'R$ 21,90', original: 'R$ 26,99', discount: '-18%', fromLabel: 'de', toLabel: 'por' },
    })
    const [from, to] = wrapper.findAll('p')
    expect(from?.classes()).toContain('gap-1')
    expect(from?.findAll('span').map((span) => span.text())).toEqual(['de'])
    expect(from?.get('s').text()).toBe('R$ 26,99')
    expect(to?.classes()).toContain('gap-1')
    expect(to?.findAll('span').map((span) => span.text())).toEqual(['por', 'R$ 21,90'])
    expect(wrapper.text()).toContain('-18%')
  })

  it('shows only the price, with no labels or discount, when there is no promotion', async () => {
    const wrapper = await mountSuspended(PriceTag, { props: { price: 'Sob consulta', fromLabel: 'de', toLabel: 'por' } })
    expect(wrapper.findAll('p')).toHaveLength(1)
    expect(wrapper.text()).toBe('Sob consulta')
  })
})
