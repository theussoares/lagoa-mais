import { afterEach, describe, expect, it } from 'vitest'
import { mountComponent, unmountAll } from '#layers/core/test/componentHarness.nuxt'
import Form from '../app/components/hits/Form.vue'
import List from '../app/components/hits/List.vue'
import StatusBadge from '../app/components/hits/StatusBadge.vue'
import { emptyHitItemForm, toHitItemPreview, toHitItemRow } from '../app/utils/hitItemForm'
import Preview from '../app/components/hits/Preview.vue'
import TagsField from '../app/components/hits/TagsField.vue'
import type { Translate } from '#layers/core/app/types/i18n'
import { draft } from './hitItemContract'

afterEach(unmountAll)

const t: Translate = (key, named = {}) => {
  const labels: Record<string, string> = { 'hitPrice.onRequest': 'Sob consulta', 'hitPrice.discount': `-${String(named.percent)}%`, 'hitTags.clubOnly': 'Só para clientes do clube' }
  return labels[key] ?? key
}

const item = {
  ...draft,
  id: '0190b0c0-1111-7000-8000-000000000001',
  status: 'pending' as const,
  rejectionReason: null,
  photoUrl: null,
  createdAt: '2026-10-01T12:00:00.000Z',
  updatedAt: '2026-10-01T12:00:00.000Z',
}

describe('HitsStatusBadge', () => {
  it('names each status and the rejection reason', async () => {
    expect((await mountComponent(StatusBadge, { status: 'pending', reason: null, missingPhoto: false })).text()).toBe('Em análise')
    expect((await mountComponent(StatusBadge, { status: 'approved', reason: null, missingPhoto: false })).text()).toBe('No ar')
    expect((await mountComponent(StatusBadge, { status: 'rejected', reason: 'Foto escura', missingPhoto: false })).text()).toBe('Recusado: Foto escura')
    expect((await mountComponent(StatusBadge, { status: 'archived', reason: null, missingPhoto: false })).text()).toBe('Arquivado')
  })

  it('says when the photo is missing', async () => {
    expect((await mountComponent(StatusBadge, { status: 'pending', reason: null, missingPhoto: true })).text()).toContain('Falta a foto')
  })
})

describe('HitsList', () => {
  it('shows price or "Sob consulta" and offers the right actions per item', async () => {
    const rows = [toHitItemRow({ ...item, priceCents: null }, t), toHitItemRow({ ...item, id: 'b', status: 'archived' }, t)]
    const page = await mountComponent(List, { rows, busy: false })
    expect(page.text()).toContain('Sob consulta')
    expect(page.text()).toContain('Editar')
    expect(page.text()).toContain('Desarquivar')
    await page.findAll('button').find((button) => button.text() === 'Editar')?.trigger('click')
    expect(page.emitted('edit')?.[0]).toEqual([item.id])
  })

  it('tells there is nothing yet', async () => {
    expect((await mountComponent(List, { rows: [], busy: false })).text()).toContain('ainda não cadastrou')
  })
})

describe('HitsList promotion', () => {
  it('shows the struck old price, the new price, the percent and the tags', async () => {
    const rows = [toHitItemRow({ ...item, priceCents: 3990, promoPriceCents: 3490, tags: ['clubOnly'] }, t)]
    const page = await mountComponent(List, { rows, busy: false })
    expect(page.get('s').text()).toMatch(/39,90/)
    expect(page.text()).toMatch(/34,90/)
    expect(page.text()).toContain('-12%')
    expect(page.text()).toContain('Só para clientes do clube')
  })
})

describe('HitsPreview', () => {
  it('shows the card as the customer will see it: de/por, percent and seal', async () => {
    const form = { ...emptyHitItemForm(), title: 'Burger Legal', price: '39,90', promoPrice: '34,90', tags: ['clubOnly' as const] }
    const page = await mountComponent(Preview, { preview: toHitItemPreview(form, null, 'Chamar', t) })
    expect(page.text()).toContain('de')
    expect(page.get('s').text()).toMatch(/39,90/)
    expect(page.text()).toContain('por')
    expect(page.text()).toContain('-12%')
    expect(page.text()).toContain('Só para clientes do clube')
  })

  it('keeps "Sob consulta" without a price', async () => {
    const page = await mountComponent(Preview, { preview: toHitItemPreview(emptyHitItemForm(), null, 'Chamar', t) })
    expect(page.text()).toContain('Sob consulta')
    expect(page.find('s').exists()).toBe(false)
  })
})

describe('HitsTagsField', () => {
  it('toggles a tag and stops offering more at the limit', async () => {
    const page = await mountComponent(TagsField, { selected: [] })
    await page.findAll('input')[0]?.trigger('change')
    expect(page.emitted('toggle')?.[0]).toEqual(['clubOnly'])
    const full = await mountComponent(TagsField, { selected: ['clubOnly', 'new'] })
    expect(full.findAll('input').map((input) => input.attributes('disabled') !== undefined)).toEqual([false, false, true])
  })
})

describe('HitsForm', () => {
  const props = { form: emptyHitItemForm(), photoUrl: null, saving: false, fieldError: null, errorKey: null }

  it('has the promo price field and shows its error under it', async () => {
    const page = await mountComponent(Form, { ...props, fieldError: 'promoNotLower' })
    expect(page.text()).toContain('Preço promocional (opcional)')
    expect(page.text()).toContain('O preço promocional precisa ser menor que o preço normal.')
  })

  it('defaults to the shop button and shows the own-button fields only when chosen', async () => {
    const page = await mountComponent(Form, props)
    expect(page.text()).toContain('Usar o botão da loja')
    expect(page.text()).not.toContain('Tipo de botão')
    const own = await mountComponent(Form, { ...props, form: { ...props.form, useShopButton: false } })
    expect(own.text()).toContain('Tipo de botão')
  })

  it('marks the field that failed and submits on save', async () => {
    const page = await mountComponent(Form, { ...props, fieldError: 'missingTitle' })
    expect(page.text()).toContain('Escreva o nome do produto.')
    await page.get('form').trigger('submit')
    expect(page.emitted('save')).toHaveLength(1)
  })
})
