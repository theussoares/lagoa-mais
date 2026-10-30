import { reactive } from 'vue'
import { AdminInviteSchema, type AdminUser } from '#shared/schemas/admin'
import type { AdminTeamAction, AdminTeamService } from '../services/AdminTeamService'
import type { TeamInviteForm, TeamScreen } from '../types/admin'

const ACTION_DONE: Readonly<Record<AdminTeamAction, string>> = {
  disable: 'team.done.disable',
  reactivate: 'team.done.reactivate',
  'reset-mfa': 'team.done.resetMfa',
}

/** Desativar e zerar o autenticador pedem um segundo clique: zerar não tem volta. Reativar não desfaz nada. */
const NEEDS_CONFIRMATION: readonly AdminTeamAction[] = ['disable', 'reset-mfa']

/** Equipe: convidar por e-mail e agir sobre os outros (a API recusa agir sobre si mesmo). */
export function createTeamScreen(service: AdminTeamService): TeamScreen {
  const screen: TeamScreen = reactive({
    members: [] as AdminUser[],
    loading: false,
    loadError: null,
    form: { name: '', email: '' } as TeamInviteForm,
    inviting: false,
    busyId: null,
    armed: null,
    message: null,

    async load(): Promise<void> {
      screen.loading = true
      const result = await service.list()
      screen.loading = false
      if (result.ok) screen.members = result.value
      else screen.loadError = result.error.code
    },

    change(patch: Partial<TeamInviteForm>): void {
      screen.form = { ...screen.form, ...patch }
    },

    async invite(): Promise<void> {
      const invite = AdminInviteSchema.safeParse(screen.form)
      if (!invite.success) {
        screen.message = { tone: 'error', key: 'team.errors.invalidInvite' }
        return
      }
      screen.inviting = true
      const result = await service.invite(invite.data)
      screen.inviting = false
      if (!result.ok) {
        screen.message = { tone: 'error', key: result.error.code === 'alreadyExists' ? 'team.errors.alreadyExists' : `errors.${result.error.code}` }
        return
      }
      screen.members = [...screen.members, result.value]
      screen.form = { name: '', email: '' }
      screen.message = { tone: 'success', key: 'team.done.invite' }
    },

    async act(id: string, action: AdminTeamAction): Promise<void> {
      const confirmed = screen.armed?.id === id && screen.armed.action === action
      if (NEEDS_CONFIRMATION.includes(action) && !confirmed) {
        screen.armed = { id, action }
        return
      }
      screen.armed = null
      screen.busyId = id
      const result = await service.act(id, action)
      screen.busyId = null
      if (!result.ok) {
        screen.message = { tone: 'error', key: result.error.code === 'forbidden' ? 'team.errors.self' : `errors.${result.error.code}` }
        return
      }
      screen.members = screen.members.map((member) => (member.id === id ? result.value : member))
      screen.message = { tone: 'success', key: ACTION_DONE[action] }
    },
  })
  return screen
}
