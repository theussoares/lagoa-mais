<script setup lang="ts">
import type { AdminUser } from '#shared/schemas/admin'
import type { AdminTeamAction } from '../../services/AdminTeamService'

interface Props {
  members: readonly AdminUser[]
  busyId: string | null
  armed: { id: string; action: AdminTeamAction } | null
}

interface Emits {
  (event: 'act', id: string, action: AdminTeamAction): void
}

defineEmits<Emits>()
const props = defineProps<Props>()
const { t } = useI18n()
const isArmed = (id: string, action: AdminTeamAction): boolean => props.armed?.id === id && props.armed.action === action
</script>

<template>
  <ul class="flex flex-col divide-y divide-(--lagoa-rule)">
    <li v-for="member in members" :key="member.id" class="flex flex-wrap items-center gap-4 py-3 first:pt-0 last:pb-0">
      <div class="flex min-w-0 flex-1 flex-col gap-1">
        <p class="font-semibold text-highlighted">{{ member.name }}</p>
        <p class="text-[0.9375rem] text-toned">{{ member.email }}</p>
      </div>
      <UBadge v-if="member.disabledAt" color="error" variant="subtle" size="lg" :label="t('team.disabled')" />
      <div class="flex flex-wrap gap-2">
        <ActionButton v-if="member.disabledAt" role="secondary" :label="t('team.actions.reactivate')" :loading="busyId === member.id" @click="$emit('act', member.id, 'reactivate')" />
        <template v-else>
          <ActionButton
            :role="isArmed(member.id, 'reset-mfa') ? 'dangerConfirm' : 'quiet'"
            :label="t(isArmed(member.id, 'reset-mfa') ? 'team.actions.confirmResetMfa' : 'team.actions.resetMfa')"
            :disabled="busyId === member.id"
            @click="$emit('act', member.id, 'reset-mfa')"
          />
          <ActionButton
            :role="isArmed(member.id, 'disable') ? 'dangerConfirm' : 'danger'"
            :label="t(isArmed(member.id, 'disable') ? 'team.actions.confirmDisable' : 'team.actions.disable')"
            :loading="busyId === member.id"
            @click="$emit('act', member.id, 'disable')"
          />
        </template>
      </div>
    </li>
  </ul>
</template>
