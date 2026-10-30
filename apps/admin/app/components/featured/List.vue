<script setup lang="ts">
import type { AdminPlacement } from '#shared/schemas/featured'
import { formatShortDate } from '#shared/utils/dateFormat'

interface Props {
  placements: readonly AdminPlacement[]
  busyId: string | null
}

interface Emits {
  (event: 'cancel', id: string): void
}

defineProps<Props>()
defineEmits<Emits>()
const { t } = useI18n()
// O fim é a meia-noite do dia seguinte ao último: um milissegundo antes cai no último dia.
const lastDay = (endsAt: string): string => formatShortDate(new Date(Date.parse(endsAt) - 1).toISOString())
</script>

<template>
  <ul v-if="placements.length > 0" class="flex flex-col divide-y divide-(--lagoa-rule)">
    <li v-for="placement in placements" :key="placement.id" class="flex flex-wrap items-center gap-4 py-3 first:pt-0 last:pb-0">
      <div class="flex min-w-0 flex-1 flex-col gap-1">
        <p class="font-semibold text-highlighted">
          {{ placement.shop.name }}<template v-if="placement.hitItem"> · {{ placement.hitItem.title }}</template>
        </p>
        <p class="text-[0.9375rem] text-toned tabular-nums">
          {{ t('featured.list.period', { start: formatShortDate(placement.startsAt), end: lastDay(placement.endsAt) }) }} · {{ t('featured.list.by', { name: placement.createdBy.name }) }}
        </p>
        <p v-if="placement.note" class="text-[0.9375rem] text-toned">{{ placement.note }}</p>
        <p v-if="placement.cancelledBy" class="text-[0.9375rem] text-error">{{ t('featured.list.cancelledBy', { name: placement.cancelledBy.name }) }}</p>
      </div>
      <ActionButton v-if="!placement.cancelledAt" role="quiet" :label="t('featured.list.cancel')" :loading="busyId === placement.id" @click="$emit('cancel', placement.id)" />
    </li>
  </ul>
  <p v-else class="text-toned">{{ t('featured.list.empty') }}</p>
</template>
