<script setup lang="ts">
import { ADMIN_MFA_CODE_LENGTH } from '#shared/constants/domain'
import type { AdminAuthErrorCode } from '#shared/types/adminAuth'

interface Props {
  code: string
  submitting: boolean
  errorCode: AdminAuthErrorCode | null
  submitLabel: string
}

interface Emits {
  (event: 'update:code', code: string): void
  (event: 'submit'): void
}

defineProps<Props>()
defineEmits<Emits>()
const { t } = useI18n()
</script>

<template>
  <form class="flex flex-col gap-4" novalidate @submit.prevent="$emit('submit')">
    <UFormField :label="t('mfa.code')" name="code">
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
    <p aria-live="polite" class="text-[0.9375rem] text-error">
      <template v-if="errorCode">{{ t(`auth.errors.${errorCode}`) }}</template>
    </p>
    <ActionButton role="primary" type="submit" :label="submitLabel" :loading="submitting" block />
  </form>
</template>
