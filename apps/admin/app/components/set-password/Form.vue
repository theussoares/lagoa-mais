<script setup lang="ts">
import { ADMIN_PASSWORD_MIN_LENGTH } from '#shared/constants/domain'
import type { PasswordForm } from '../../types/views'

interface Props {
  form: PasswordForm
  submitting: boolean
  /** Chave i18n completa do erro, ou nada. */
  errorKey: string | null
  submitLabel: string
}

interface Emits {
  (event: 'change', patch: Partial<PasswordForm>): void
  (event: 'submit'): void
}

defineProps<Props>()
defineEmits<Emits>()
const { t } = useI18n()
</script>

<template>
  <form class="flex flex-col gap-5" novalidate @submit.prevent="$emit('submit')">
    <UFormField :label="t('auth.newPassword')" :hint="t('auth.passwordHint', { min: ADMIN_PASSWORD_MIN_LENGTH })" name="password">
      <UInput :model-value="form.password" type="password" autocomplete="new-password" size="xl" class="w-full" :ui="{ base: 'min-h-11' }" @update:model-value="$emit('change', { password: String($event) })" />
    </UFormField>
    <UFormField :label="t('auth.confirmPassword')" name="confirmation">
      <UInput :model-value="form.confirmation" type="password" autocomplete="new-password" size="xl" class="w-full" :ui="{ base: 'min-h-11' }" @update:model-value="$emit('change', { confirmation: String($event) })" />
    </UFormField>
    <!-- Código do autenticador, quando a ação pede (recuperação de conta com autenticador, troca de senha). -->
    <slot />
    <p aria-live="polite" class="text-[0.9375rem] text-error">
      <template v-if="errorKey">{{ t(errorKey) }}</template>
    </p>
    <ActionButton role="primary" type="submit" :label="submitLabel" :loading="submitting" />
  </form>
</template>
