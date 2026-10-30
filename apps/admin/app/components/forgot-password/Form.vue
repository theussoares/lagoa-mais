<script setup lang="ts">
import type { AdminAuthErrorCode } from '#shared/types/adminAuth'

interface Props {
  email: string
  submitting: boolean
  sent: boolean
  errorCode: AdminAuthErrorCode | null
  captchaResetKey: number
}

interface Emits {
  (event: 'update:email', email: string): void
  (event: 'captcha', token: string): void
  (event: 'submit'): void
}

defineProps<Props>()
defineEmits<Emits>()
const { t } = useI18n()
</script>

<template>
  <InkNote v-if="sent" tone="success" :description="t('forgot.sent')" />
  <form v-else class="flex flex-col gap-5" novalidate @submit.prevent="$emit('submit')">
    <UFormField :label="t('auth.email')" name="email">
      <UInput :model-value="email" type="email" autocomplete="username" size="xl" class="w-full" :ui="{ base: 'min-h-11' }" @update:model-value="$emit('update:email', String($event))" />
    </UFormField>
    <TurnstileWidget :reset-key="captchaResetKey" @token="$emit('captcha', $event)" />
    <p aria-live="polite" class="text-[0.9375rem] text-error">
      <template v-if="errorCode">{{ t(`auth.errors.${errorCode}`) }}</template>
    </p>
    <ActionButton role="primary" type="submit" :label="t('forgot.submit')" :loading="submitting" block />
  </form>
</template>
