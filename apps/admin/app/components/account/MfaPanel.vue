<script setup lang="ts">
import type { AdminMfaEnrollment } from '#shared/schemas/admin'

interface Props {
  enrollment: AdminMfaEnrollment | null
  code: string
  currentCode: string
  busy: boolean
}

interface Emits {
  (event: 'start' | 'confirm' | 'cancel'): void
  (event: 'update:code' | 'update:currentCode', code: string): void
}

defineProps<Props>()
defineEmits<Emits>()
const { t } = useI18n()
</script>

<template>
  <div v-if="enrollment" class="flex flex-col gap-5">
    <MfaEnroll :enrollment="enrollment" />
    <MfaCodeForm :code="code" :submitting="busy" :error-code="null" :submit-label="t('account.mfa.confirm')" @update:code="$emit('update:code', $event)" @submit="$emit('confirm')" />
    <ActionButton role="quiet" :label="t('account.mfa.cancel')" :disabled="busy" class="self-start" @click="$emit('cancel')" />
  </div>
  <div v-else class="flex flex-col gap-3">
    <p class="text-pretty text-toned">{{ t('account.mfa.lead') }}</p>
    <CurrentCodeField :code="currentCode" :label="t('auth.currentCode')" @update:code="$emit('update:currentCode', $event)" />
    <ActionButton role="secondary" :label="t('account.mfa.start')" :loading="busy" class="self-start" @click="$emit('start')" />
  </div>
</template>
