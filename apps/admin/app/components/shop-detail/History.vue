<script setup lang="ts">
import type { AdminShopStatusEvent } from '#shared/schemas/admin'
import { formatShortDateTime } from '#shared/utils/dateFormat'

interface Props {
  events: readonly AdminShopStatusEvent[]
}

defineProps<Props>()
const { t } = useI18n()
</script>

<template>
  <ol v-if="events.length > 0" class="flex flex-col divide-y divide-(--lagoa-rule)">
    <li v-for="entry in events" :key="entry.id" class="flex flex-col gap-1 py-3 first:pt-0 last:pb-0">
      <p class="text-default">
        {{ t('shopDetail.history.line', { from: t(`shopStatus.${entry.fromStatus}`), to: t(`shopStatus.${entry.toStatus}`), plan: t(`plans.${entry.plan}`) }) }}
      </p>
      <p class="text-[0.9375rem] text-toned">{{ entry.actorName }} · {{ formatShortDateTime(entry.createdAt) }}</p>
      <p v-if="entry.reason" class="text-[0.9375rem] text-toned">{{ t('shopDetail.history.reason', { reason: entry.reason }) }}</p>
    </li>
  </ol>
  <p v-else class="text-toned">{{ t('shopDetail.history.empty') }}</p>
</template>
