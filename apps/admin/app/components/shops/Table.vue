<script setup lang="ts">
import type { AdminShopRow } from '#shared/schemas/admin'
import { formatShortDate } from '#shared/utils/dateFormat'

interface Props {
  shops: readonly AdminShopRow[]
}

defineProps<Props>()
const { t } = useI18n()
</script>

<template>
  <table v-if="shops.length > 0" class="w-full text-left text-[0.9375rem]">
    <thead class="text-toned">
      <tr class="border-b border-(--lagoa-rule)">
        <th scope="col" class="py-2 pr-4 font-medium">{{ t('shops.columns.name') }}</th>
        <th scope="col" class="py-2 pr-4 font-medium">{{ t('shops.columns.category') }}</th>
        <th scope="col" class="py-2 pr-4 font-medium">{{ t('shops.columns.neighborhood') }}</th>
        <th scope="col" class="py-2 pr-4 font-medium">{{ t('shops.columns.status') }}</th>
        <th scope="col" class="py-2 pr-4 font-medium">{{ t('shops.columns.plan') }}</th>
        <th scope="col" class="py-2 font-medium">{{ t('shops.columns.createdAt') }}</th>
      </tr>
    </thead>
    <tbody class="divide-y divide-(--lagoa-rule)">
      <tr v-for="shop in shops" :key="shop.id">
        <td class="py-3 pr-4">
          <NuxtLink :to="`/lojas/${shop.id}`" class="inline-flex min-h-11 items-center font-semibold text-highlighted underline-offset-4 hover:underline">{{ shop.name }}</NuxtLink>
        </td>
        <td class="py-3 pr-4">{{ t(`categories.${shop.category}`) }}</td>
        <td class="py-3 pr-4">{{ shop.neighborhood }}</td>
        <td class="py-3 pr-4"><ShopsStatusBadge :status="shop.status" /></td>
        <td class="py-3 pr-4">{{ t(`plans.${shop.plan}`) }}</td>
        <td class="py-3 tabular-nums">{{ formatShortDate(shop.createdAt) }}</td>
      </tr>
    </tbody>
  </table>
  <p v-else class="rounded-(--radius-card) border-2 border-dashed border-(--lagoa-slot) px-4 py-3 text-toned" role="status">{{ t('shops.empty') }}</p>
</template>
