<script setup lang="ts">
import { HIT_ITEM_REJECTION_REASON_MAX_LENGTH } from '#shared/constants/domain'
import type { AdminHitItemTab } from '#shared/schemas/admin'
import type { HitCard } from '../../types/views'

interface Props {
  card: HitCard
  tab: AdminHitItemTab
  reason: string
  reasonMissing: boolean
  busy: boolean
}

interface Emits {
  (event: 'approve' | 'reject' | 'takeDown'): void
  (event: 'update:reason', reason: string): void
}

defineProps<Props>()
defineEmits<Emits>()
const { t } = useI18n()
</script>

<template>
  <article class="card grid gap-5 p-4 md:grid-cols-[280px_minmax(0,1fr)]">
    <img v-if="card.photoUrl" :src="card.photoUrl" :alt="t('hits.photoAlt', { title: card.title })" class="aspect-square w-full rounded-(--radius-card) object-cover" >
    <div class="flex min-w-0 flex-col gap-3">
      <header class="flex flex-wrap items-baseline justify-between gap-2">
        <h2 class="text-lg font-semibold text-highlighted">{{ card.title }}</h2>
        <p class="text-lg tabular-nums">{{ card.priceLabel ?? t('hits.onRequest') }}</p>
      </header>
      <p class="text-[0.9375rem] text-toned">{{ card.shopName }} · {{ t(`shopStatus.${card.shopStatus}`) }} · {{ t('hits.sentAt', { date: card.createdLabel }) }}</p>
      <p v-if="card.description" class="text-pretty">{{ card.description }}</p>
      <p v-if="card.endsLabel" class="text-[0.9375rem] text-toned">{{ t('hits.endsAt', { date: card.endsLabel }) }}</p>
      <div class="flex flex-col gap-1 rounded-(--radius-card) border border-(--lagoa-rule) px-3 py-2">
        <p class="type-tag text-toned">{{ t(card.contactSource === 'item' ? 'hits.button.own' : 'hits.button.shop') }}</p>
        <template v-if="card.contactHref">
          <p v-if="card.contactLabel">{{ t('hits.button.label', { label: card.contactLabel }) }}</p>
          <p class="break-all font-mono text-[0.875rem]">{{ card.contactHref }}</p>
        </template>
        <p v-else class="text-toned">{{ t('hits.button.none') }}</p>
      </div>
      <UFormField :label="t(tab === 'pending' ? 'hits.rejectReason' : 'hits.takeDownReason')" name="reason" :error="reasonMissing ? t('hits.reasonMissing') : undefined">
        <UTextarea :model-value="reason" :maxlength="HIT_ITEM_REJECTION_REASON_MAX_LENGTH" :rows="2" autoresize class="w-full" @update:model-value="$emit('update:reason', String($event))" />
      </UFormField>
      <div class="flex flex-wrap gap-3">
        <template v-if="tab === 'pending'">
          <ActionButton role="primary" :label="t('hits.approve')" :loading="busy" @click="$emit('approve')" />
          <ActionButton role="danger" :label="t('hits.reject')" :disabled="busy" @click="$emit('reject')" />
        </template>
        <ActionButton v-else role="danger" :label="t('hits.takeDown')" :loading="busy" @click="$emit('takeDown')" />
      </div>
    </div>
  </article>
</template>
