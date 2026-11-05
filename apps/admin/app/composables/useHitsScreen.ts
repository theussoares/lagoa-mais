import type { HitsScreen } from '../types/admin'
import type { HitCard } from '../types/views'
import { createHitsScreen } from '../screens/hitsScreen'
import { toHitCard } from '../utils/hitCard'

/** Tela Hits: a fila do modelo e os cards já montados para desenhar. */
export function useHitsScreen(): HitsScreen & { cards: HitCard[] } {
  const screen = createHitsScreen(useAdminServices().hits)
  onMounted(() => void screen.load())
  return reactive(Object.assign(screen, { cards: computed(() => screen.items.map(toHitCard)) }))
}
