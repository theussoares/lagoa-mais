import { reactive } from 'vue'
import { FEATURED_AGENDA_DAYS } from '#shared/constants/domain'
import type { AdminHitItem, AdminShopRow } from '#shared/schemas/admin'
import { ShopIdSchema } from '#shared/schemas/ids'
import type { FeaturedPlacementDraft, FeaturedRangeQuery, FeaturedSurface } from '#shared/schemas/featured'
import { addDays, localDateParts, localMidnight, toIso } from '#shared/utils/time'
import type { FeaturedForm, FeaturedScreen, FeaturedScreenDeps } from '../types/admin'

const emptyForm = (): FeaturedForm => ({ shopId: '', hitItemId: '', startDate: '', endDate: '', note: '' })

/**
 * Destaques pagos: a agenda de vagas livres vem antes do formulário, e um período com dia lotado nem deixa lançar (a
 * API confere de novo, sob lock). O período é de dias locais: começa à meia-noite do primeiro e acaba à do dia seguinte
 * ao último.
 */
export function createFeaturedScreen(deps: FeaturedScreenDeps): FeaturedScreen {
  let approvedShops: AdminShopRow[] = []
  let approvedItems: AdminHitItem[] = []

  const range = (): FeaturedRangeQuery => {
    const from = localDateParts(deps.now()).isoDate
    return { surface: screen.surface, from, to: localDateParts(addDays(localMidnight(from), FEATURED_AGENDA_DAYS)).isoDate }
  }

  const targetShopId = (): string => {
    if (screen.surface === 'discoverCarousel') return screen.form.shopId
    return approvedItems.find((item) => item.id === screen.form.hitItemId)?.shop.id ?? ''
  }
  const validPeriod = (): boolean => screen.form.startDate !== '' && screen.form.endDate !== '' && screen.form.startDate <= screen.form.endDate

  async function loadAgenda(): Promise<void> {
    const [list, availability] = await Promise.all([deps.featured.list(range()), deps.featured.availability(range())])
    if (!list.ok || !availability.ok) {
      screen.loadError = (list.ok ? null : list.error.code) ?? (availability.ok ? null : availability.error.code)
      return
    }
    screen.loadError = null
    screen.placements = list.value.placements
    screen.proShops = list.value.proShops
    screen.days = availability.value.days
  }

  async function loadTargets(): Promise<void> {
    const [shops, items] = await Promise.all([deps.shops.list({ status: 'approved' }), deps.hits.list({ status: 'approved' })])
    approvedShops = shops.ok ? shops.value.shops : []
    approvedItems = items.ok ? items.value.items : []
    screen.shopOptions = approvedShops.map((shop) => ({ value: shop.id, label: shop.name }))
    screen.itemOptions = approvedItems.map((item) => ({ value: item.id, label: `${item.title} · ${item.shop.name}` }))
  }

  const screen: FeaturedScreen = reactive({
    surface: 'discoverCarousel' as FeaturedSurface,
    form: emptyForm(),
    placements: [],
    proShops: [],
    days: [],
    shopOptions: [],
    itemOptions: [],
    get fullDays(): string[] {
      if (!validPeriod()) return []
      return screen.days.filter((day) => day.date >= screen.form.startDate && day.date <= screen.form.endDate && day.freeSlots === 0).map((day) => day.date)
    },
    get canLaunch(): boolean {
      return targetShopId() !== '' && validPeriod() && screen.fullDays.length === 0 && !screen.saving
    },
    loading: false,
    loadError: null,
    saving: false,
    busyId: null,
    message: null,

    async load(): Promise<void> {
      screen.loading = true
      await Promise.all([loadAgenda(), loadTargets()])
      screen.loading = false
    },

    async switchSurface(surface: FeaturedSurface): Promise<void> {
      screen.surface = surface
      screen.form = { ...emptyForm(), startDate: screen.form.startDate, endDate: screen.form.endDate }
      screen.message = null
      screen.loading = true
      await loadAgenda()
      screen.loading = false
    },

    change(patch: Partial<FeaturedForm>): void {
      screen.form = { ...screen.form, ...patch }
    },

    async launch(): Promise<void> {
      const shopId = ShopIdSchema.safeParse(targetShopId())
      if (!screen.canLaunch || !shopId.success) return
      const note = screen.form.note.trim()
      const draft: FeaturedPlacementDraft = {
        shopId: shopId.data,
        surface: screen.surface,
        hitItemId: screen.surface === 'hitsBanner' ? screen.form.hitItemId : null,
        startsAt: toIso(localMidnight(screen.form.startDate)),
        endsAt: toIso(addDays(localMidnight(screen.form.endDate), 1)),
        note: note === '' ? null : note,
      }
      screen.saving = true
      const result = await deps.featured.create(draft)
      screen.saving = false
      if (result.ok) {
        screen.form = emptyForm()
        screen.message = { tone: 'success', key: 'featured.launched' }
        await loadAgenda()
        return
      }
      const known = result.error.code === 'slotsFull' || result.error.code === 'invalidTarget'
      screen.message = { tone: 'error', key: known ? `featured.errors.${result.error.code}` : `errors.${result.error.code}` }
      if (result.error.code === 'slotsFull') await loadAgenda()
    },

    async cancel(id: string): Promise<void> {
      screen.busyId = id
      const result = await deps.featured.cancel(id)
      screen.busyId = null
      screen.message = result.ok ? { tone: 'success', key: 'featured.cancelled' } : { tone: 'error', key: `errors.${result.error.code}` }
      await loadAgenda()
    },
  })
  return screen
}
