import type { ShopDetailScreen } from '../types/admin'
import { createShopDetailScreen } from '../screens/shopsScreen'

export function useShopDetailScreen(shopId: string): ShopDetailScreen {
  const screen = createShopDetailScreen(useAdminServices().shops, shopId)
  onMounted(() => void screen.load())
  return screen
}
