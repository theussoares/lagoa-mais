<script setup lang="ts">
import type { ShopStatus } from '#shared/schemas/shop'

interface Props {
  status: ShopStatus
}

defineProps<Props>()
const { t } = useI18n()
const COLOR: Readonly<Record<ShopStatus, 'warning' | 'success' | 'error'>> = { pending: 'warning', approved: 'success', suspended: 'error' }
</script>

<template>
  <UBadge :color="COLOR[status]" variant="subtle" size="lg" :label="t(`shopStatus.${status}`)" />
</template>
