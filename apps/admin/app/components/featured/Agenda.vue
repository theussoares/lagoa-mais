<script setup lang="ts">
import type { FeaturedAvailability } from '#shared/schemas/featured'

interface Props {
  days: FeaturedAvailability['days']
  /** Dias do período escolhido que estão lotados: ficam marcados. */
  fullDays: readonly string[]
}

defineProps<Props>()
const { t } = useI18n()
const dayLabel = (date: string): string => `${date.slice(8, 10)}/${date.slice(5, 7)}`
</script>

<template>
  <ol class="grid grid-cols-7 gap-1.5" :aria-label="t('featured.agenda.label')">
    <li
      v-for="day in days"
      :key="day.date"
      class="flex flex-col items-center rounded-[6px] border px-1 py-1.5 text-[0.8125rem] tabular-nums"
      :class="[day.freeSlots === 0 ? 'border-error/60 bg-error/10 text-error' : 'border-(--lagoa-rule)', fullDays.includes(day.date) ? 'ring-2 ring-error' : '']"
    >
      <span>{{ dayLabel(day.date) }}</span>
      <span class="font-semibold">{{ day.freeSlots === 0 ? t('featured.agenda.full') : t('featured.agenda.free', { count: day.freeSlots }) }}</span>
    </li>
  </ol>
</template>
