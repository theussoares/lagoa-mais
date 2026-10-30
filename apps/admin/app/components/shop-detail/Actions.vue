<script setup lang="ts">
import { ADMIN_REASON_MAX_LENGTH } from '#shared/constants/domain'
import type { ShopPlan, ShopStatus } from '#shared/schemas/shop'

interface Props {
  status: ShopStatus
  plan: ShopPlan
  reason: string
  reasonMissing: boolean
  busy: boolean
}

interface Emits {
  (event: 'approve' | 'reactivate' | 'suspend'): void
  (event: 'changePlan', plan: ShopPlan): void
  (event: 'update:reason', reason: string): void
}

defineProps<Props>()
defineEmits<Emits>()
const { t } = useI18n()
</script>

<template>
  <div class="flex flex-col gap-5">
    <div class="flex flex-wrap gap-3">
      <ActionButton v-if="status === 'pending'" role="primary" :label="t('shopDetail.actions.approve')" :loading="busy" @click="$emit('approve')" />
      <ActionButton v-if="status === 'suspended'" role="primary" :label="t('shopDetail.actions.reactivate')" :loading="busy" @click="$emit('reactivate')" />
      <ActionButton role="secondary" :label="t(plan === 'founder' ? 'shopDetail.actions.toPro' : 'shopDetail.actions.toFounder')" :disabled="busy" @click="$emit('changePlan', plan === 'founder' ? 'founderPro' : 'founder')" />
    </div>
    <form v-if="status !== 'suspended'" class="flex flex-col gap-3" novalidate @submit.prevent="$emit('suspend')">
      <UFormField :label="t('shopDetail.actions.suspendReason')" name="reason" :error="reasonMissing ? t('shopDetail.errors.reasonMissing') : undefined">
        <UTextarea :model-value="reason" :maxlength="ADMIN_REASON_MAX_LENGTH" :rows="2" autoresize class="w-full" @update:model-value="$emit('update:reason', String($event))" />
      </UFormField>
      <ActionButton role="danger" type="submit" :label="t('shopDetail.actions.suspend')" :disabled="busy" class="self-start" />
    </form>
  </div>
</template>
