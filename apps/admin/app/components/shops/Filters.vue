<script setup lang="ts">
import type { ShopStatusFilter } from '../../types/admin'

interface Props {
  status: ShopStatusFilter
  query: string
  loading: boolean
}

interface Emits {
  (event: 'update:status', status: ShopStatusFilter): void
  (event: 'update:query', query: string): void
  (event: 'search'): void
}

defineProps<Props>()
const emit = defineEmits<Emits>()
const { t } = useI18n()
const STATUSES: readonly ShopStatusFilter[] = ['all', 'pending', 'approved', 'suspended']

function pick(status: ShopStatusFilter): void {
  emit('update:status', status)
  emit('search')
}
</script>

<template>
  <form class="flex flex-wrap items-end gap-3" role="search" @submit.prevent="$emit('search')">
    <UFormField :label="t('shops.search')" name="q" class="min-w-[280px] flex-1">
      <UInput :model-value="query" size="xl" class="w-full" :ui="{ base: 'min-h-11' }" @update:model-value="$emit('update:query', String($event))" />
    </UFormField>
    <ActionButton role="secondary" type="submit" :label="t('shops.searchSubmit')" :loading="loading" />
    <div class="flex flex-wrap gap-2" role="group" :aria-label="t('shops.statusFilter')">
      <ActionButton v-for="option in STATUSES" :key="option" :role="status === option ? 'primary' : 'quiet'" :label="t(`shops.filter.${option}`)" :aria-pressed="status === option" @click="pick(option)" />
    </div>
  </form>
</template>
