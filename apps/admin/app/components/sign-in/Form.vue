<script setup lang="ts">
import type { AdminAuthErrorCode } from '#shared/types/adminAuth'
import type { SignInForm } from '../../types/views'

interface Props {
  form: SignInForm
  submitting: boolean
  errorCode: AdminAuthErrorCode | null
  captchaResetKey: number
}

interface Emits {
  (event: 'change', patch: Partial<SignInForm>): void
  (event: 'captcha', token: string): void
  (event: 'submit'): void
}

defineProps<Props>()
defineEmits<Emits>()
const { t } = useI18n()
</script>

<template>
  <form class="flex flex-col gap-5" novalidate @submit.prevent="$emit('submit')">
    <UFormField :label="t('auth.email')" name="email">
      <UInput :model-value="form.email" type="email" autocomplete="username" size="xl" class="w-full" :ui="{ base: 'min-h-11' }" @update:model-value="$emit('change', { email: String($event) })" />
    </UFormField>
    <UFormField :label="t('auth.password')" name="password">
      <UInput :model-value="form.password" type="password" autocomplete="current-password" size="xl" class="w-full" :ui="{ base: 'min-h-11' }" @update:model-value="$emit('change', { password: String($event) })" />
    </UFormField>
    <TurnstileWidget :reset-key="captchaResetKey" @token="$emit('captcha', $event)" />
    <p aria-live="polite" class="text-[0.9375rem] text-error">
      <template v-if="errorCode">{{ t(`auth.errors.${errorCode}`) }}</template>
    </p>
    <ActionButton role="primary" type="submit" :label="t('signIn.submit')" :loading="submitting" block />
    <NuxtLink to="/esqueci-a-senha" class="min-h-11 text-center text-[0.9375rem] text-toned underline">{{ t('signIn.forgot') }}</NuxtLink>
  </form>
</template>
