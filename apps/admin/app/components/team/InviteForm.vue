<script setup lang="ts">
import { ADMIN_NAME_MAX_LENGTH } from '#shared/constants/domain'
import type { TeamInviteForm } from '../../types/admin'

interface Props {
  form: TeamInviteForm
  inviting: boolean
}

interface Emits {
  (event: 'change', patch: Partial<TeamInviteForm>): void
  (event: 'invite'): void
}

defineProps<Props>()
defineEmits<Emits>()
const { t } = useI18n()
</script>

<template>
  <form class="flex flex-wrap items-end gap-3" novalidate @submit.prevent="$emit('invite')">
    <UFormField :label="t('team.form.name')" name="name" class="min-w-[220px] flex-1">
      <UInput :model-value="form.name" :maxlength="ADMIN_NAME_MAX_LENGTH" size="xl" class="w-full" :ui="{ base: 'min-h-11' }" @update:model-value="$emit('change', { name: String($event) })" />
    </UFormField>
    <UFormField :label="t('auth.email')" name="email" class="min-w-[260px] flex-1">
      <UInput :model-value="form.email" type="email" size="xl" class="w-full" :ui="{ base: 'min-h-11' }" @update:model-value="$emit('change', { email: String($event) })" />
    </UFormField>
    <ActionButton role="primary" type="submit" :label="t('team.form.invite')" :loading="inviting" />
  </form>
</template>
