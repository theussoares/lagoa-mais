import { describe, expect, it, vi } from 'vitest'
import { ok } from '#shared/types/result'
import { createTeamScreen } from '../screens/teamScreen'
import type { AdminTeamService } from '../services/AdminTeamService'

const member = { id: '0190a000-0000-7000-8000-00000000a002', name: 'Bia', email: 'bia@rede.test', disabledAt: null, createdAt: '2026-10-01T12:00:00.000Z' }

function service(): AdminTeamService {
  return { list: vi.fn(async () => ok([member])), invite: vi.fn(async () => ok(member)), act: vi.fn(async () => ok(member)) }
}

describe('team screen', () => {
  it('asks a second click before disabling someone or resetting their authenticator', async () => {
    const team = service()
    const screen = createTeamScreen(team)
    await screen.load()
    await screen.act(member.id, 'reset-mfa')
    expect(team.act).not.toHaveBeenCalled()
    expect(screen.armed).toEqual({ id: member.id, action: 'reset-mfa' })
    await screen.act(member.id, 'reset-mfa')
    expect(team.act).toHaveBeenCalledWith(member.id, 'reset-mfa')
    expect(screen.armed).toBeNull()
  })

  it('reactivates in one click (it undoes nothing)', async () => {
    const team = service()
    const screen = createTeamScreen(team)
    await screen.act(member.id, 'reactivate')
    expect(team.act).toHaveBeenCalledWith(member.id, 'reactivate')
  })

  it('does not invite with an invalid e-mail', async () => {
    const team = service()
    const screen = createTeamScreen(team)
    screen.change({ name: 'Caio', email: 'caio' })
    await screen.invite()
    expect(team.invite).not.toHaveBeenCalled()
    expect(screen.message).toEqual({ tone: 'error', key: 'team.errors.invalidInvite' })
  })
})
