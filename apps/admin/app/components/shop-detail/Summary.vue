<script setup lang="ts">
import type { AdminShopDetail } from '#shared/schemas/admin'
import { formatPhoneInput } from '#shared/utils/phone'

interface Props {
  shop: AdminShopDetail
}

defineProps<Props>()
const { t } = useI18n()
</script>

<template>
  <dl class="grid gap-x-6 gap-y-4 sm:grid-cols-2">
    <div><dt class="text-[0.9375rem] text-toned">{{ t('shopDetail.category') }}</dt><dd>{{ t(`categories.${shop.category}`) }}</dd></div>
    <div><dt class="text-[0.9375rem] text-toned">{{ t('shopDetail.address') }}</dt><dd>{{ shop.addressLine }} · {{ shop.neighborhood }}</dd></div>
    <div><dt class="text-[0.9375rem] text-toned">{{ t('shopDetail.plan') }}</dt><dd>{{ t(`plans.${shop.plan}`) }}</dd></div>
    <div>
      <dt class="text-[0.9375rem] text-toned">{{ t('shopDetail.program') }}</dt>
      <dd v-if="shop.program">{{ t(`programModes.${shop.program.mode}`) }} · {{ t('shopDetail.target', { target: shop.program.target }) }} · {{ shop.program.rewardTitle }}</dd>
      <dd v-else class="text-toned">{{ t('shopDetail.noProgram') }}</dd>
    </div>
    <div><dt class="text-[0.9375rem] text-toned">{{ t('shopDetail.stats.customers') }}</dt><dd class="tabular-nums">{{ shop.stats.customers }}</dd></div>
    <div><dt class="text-[0.9375rem] text-toned">{{ t('shopDetail.stats.visits') }}</dt><dd class="tabular-nums">{{ shop.stats.visitsLast30Days }}</dd></div>
    <div class="sm:col-span-2">
      <dt class="text-[0.9375rem] text-toned">{{ t('shopDetail.owner') }}</dt>
      <dd v-if="shop.owner" class="flex flex-wrap gap-x-4">
        <a :href="`tel:+55${shop.owner.phone}`" class="inline-flex min-h-11 items-center underline">{{ formatPhoneInput(shop.owner.phone) }}</a>
        <a v-if="shop.owner.email" :href="`mailto:${shop.owner.email}`" class="inline-flex min-h-11 items-center underline">{{ shop.owner.email }}</a>
      </dd>
      <dd v-else class="text-toned">{{ t('shopDetail.ownerGone') }}</dd>
    </div>
  </dl>
</template>
