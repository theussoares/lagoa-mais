<script setup lang="ts">
import type { ShopFieldErrors, ShopProfileForm } from '../../types/clubSetup'
import type { PostalCodeField } from '../../types/postalCode'

interface Props {
  errors: ShopFieldErrors
  postalCode: PostalCodeField
}

interface Emits {
  postalCode: [value: string]
}

defineProps<Props>()
const emit = defineEmits<Emits>()
const shop = defineModel<ShopProfileForm>('shop', { required: true })
</script>

<template>
  <PanelModule :title="$t('clubSetup.shop.module')">
    <ClubSetupShopFields v-model:shop="shop" :errors="errors" :postal-code="postalCode" @postal-code="emit('postalCode', $event)" />
  </PanelModule>
</template>
