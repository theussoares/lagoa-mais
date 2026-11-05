<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { CustomerRowModel, CustomerTableLabels } from '../../types/customer'

interface Props {
  rows: readonly CustomerRowModel[]
  labels: CustomerTableLabels
  caption: string
}

const props = defineProps<Props>()

const columns = computed<TableColumn<CustomerRowModel>[]>(() => [
  { id: 'customer', header: props.labels.customer },
  { id: 'card', header: props.labels.card },
  { accessorKey: 'visits', header: props.labels.visits, meta: { class: { th: 'text-right', td: 'text-right' } } },
  { id: 'lastVisit', header: props.labels.lastVisit },
  { id: 'lastPurchase', header: props.labels.lastPurchase, meta: { class: { th: 'text-right', td: 'text-right' } } },
])
</script>

<template>
  <div>
    <ul class="flex flex-col divide-y divide-(--lagoa-rule) md:hidden" :aria-label="caption">
      <li v-for="item in rows" :key="item.id" class="flex flex-col gap-2.5 py-3.5 first:pt-0 last:pb-0">
        <div class="flex items-start justify-between gap-2">
          <div class="flex min-w-0 flex-col">
            <span class="truncate font-semibold text-highlighted" :class="{ 'text-muted italic font-normal': item.name === null }">
              {{ item.name ?? labels.noName }}
            </span>
            <span class="tabular text-sm text-muted">{{ item.phone }}</span>
          </div>
          <div class="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
            <StampTag v-if="item.rewardReady" :label="labels.rewardReady" tone="reward" icon="i-ph-gift" />
            <StampTag v-if="item.isLapsed" :label="labels.lapsed" tone="warning" />
          </div>
        </div>
        <div class="flex flex-col gap-1.5">
          <div class="flex items-center justify-between gap-2 text-sm">
            <span class="tabular font-medium text-highlighted">{{ item.progress }}</span>
            <span class="tabular text-muted">{{ labels.visits }}: {{ item.visits }} · {{ item.lastVisit }}</span>
          </div>
          <InkRule :fraction="item.progressRatio" :tone="item.rewardReady ? 'reward' : 'ink'" class="w-full" />
        </div>
      </li>
    </ul>

    <UTable
      :data="[...rows]"
      :columns="columns"
      :get-row-id="(row: CustomerRowModel) => row.id"
      :caption="caption"
      class="hidden md:block"
      :ui="{ caption: 'sr-only', th: 'text-[0.9375rem] font-semibold text-muted', td: 'text-[0.9375rem] text-default', tr: 'border-b border-(--lagoa-rule) last:border-b-0' }"
    >
    <template #customer-cell="{ row }">
      <span class="flex flex-col">
        <span class="font-semibold text-highlighted" :class="{ 'text-muted italic font-normal': row.original.name === null }">
          {{ row.original.name ?? labels.noName }}
        </span>
        <span class="tabular text-muted">{{ row.original.phone }}</span>
      </span>
    </template>

    <template #card-cell="{ row }">
      <span class="flex min-w-40 flex-col gap-1.5">
        <span class="flex items-center gap-2">
          <span class="tabular">{{ row.original.progress }}</span>
          <StampTag v-if="row.original.rewardReady" :label="labels.rewardReady" tone="reward" icon="i-ph-gift" />
        </span>
        <InkRule :fraction="row.original.progressRatio" :tone="row.original.rewardReady ? 'reward' : 'ink'" class="max-w-40" />
      </span>
    </template>

    <template #visits-cell="{ row }">
      <span class="tabular">{{ row.original.visits }}</span>
    </template>

    <template #lastVisit-cell="{ row }">
      <span class="flex items-center gap-2">
        <span class="tabular">{{ row.original.lastVisit }}</span>
        <StampTag v-if="row.original.isLapsed" :label="labels.lapsed" tone="warning" />
      </span>
    </template>

    <template #lastPurchase-cell="{ row }">
      <span v-if="row.original.lastPurchase" class="tabular">{{ row.original.lastPurchase }}</span>
      <span v-else class="text-muted">{{ labels.noPurchase }}</span>
    </template>
    </UTable>
  </div>
</template>
