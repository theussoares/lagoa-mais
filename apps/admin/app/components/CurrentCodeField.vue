<script setup lang="ts">
import { ADMIN_MFA_CODE_LENGTH } from '#shared/constants/domain'

interface Props {
  code: string
  label: string
  hint?: string
}

interface Emits {
  (event: 'update:code', code: string): void
}

defineProps<Props>()
defineEmits<Emits>()
</script>

<template>
  <UFormField :label="label" :description="hint" name="currentCode">
    <UInput
      :model-value="code"
      inputmode="numeric"
      autocomplete="one-time-code"
      :maxlength="ADMIN_MFA_CODE_LENGTH"
      size="xl"
      class="w-full"
      :ui="{ base: 'min-h-11 font-mono tracking-[0.3em] text-lg' }"
      @update:model-value="$emit('update:code', String($event))"
    />
  </UFormField>
</template>
