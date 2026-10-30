import type { ShopsScreen } from '../types/admin'
import { createShopsScreen } from '../screens/shopsScreen'

export function useShopsScreen(): ShopsScreen {
  const screen = createShopsScreen(useAdminServices().shops)
  onMounted(() => void screen.load())
  return screen
}
