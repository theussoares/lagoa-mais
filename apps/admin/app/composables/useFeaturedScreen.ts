import type { FeaturedScreen } from '../types/admin'
import { createFeaturedScreen } from '../screens/featuredScreen'

export function useFeaturedScreen(): FeaturedScreen {
  const { featured, shops, hits } = useAdminServices()
  const screen = createFeaturedScreen({ featured, shops, hits, now: () => new Date() })
  onMounted(() => void screen.load())
  return screen
}
