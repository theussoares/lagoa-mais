import type { TeamScreen } from '../types/admin'
import { createTeamScreen } from '../screens/teamScreen'

export function useTeamScreen(): TeamScreen {
  const screen = createTeamScreen(useAdminServices().team)
  onMounted(() => void screen.load())
  return screen
}
