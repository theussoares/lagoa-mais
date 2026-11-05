<script setup lang="ts">
import { FEATURED_NOTE_MAX_LENGTH } from '#shared/constants/domain'
import type { FeaturedSurface } from '#shared/schemas/featured'
import type { FeaturedForm, FeaturedOption } from '../../types/admin'

interface Props {
  surface: FeaturedSurface
  form: FeaturedForm
  shopOptions: readonly FeaturedOption[]
  itemOptions: readonly FeaturedOption[]
  fullDays: readonly string[]
  canLaunch: boolean
  saving: boolean
}

interface Emits {
  (event: 'change', patch: Partial<FeaturedForm>): void
  (event: 'launch'): void
}

defineProps<Props>()
defineEmits<Emits>()
const { t } = useI18n()
const dayLabel = (date: string): string => `${date.slice(8, 10)}/${date.slice(5, 7)}`
</script>

<template>
  <form class="flex flex-col gap-5" novalidate @submit.prevent="$emit('launch')">
    <UFormField v-if="surface === 'discoverCarousel'" :label="t('featured.form.shop')" name="shopId">
      <USelect :model-value="form.shopId" :items="[...shopOptions]" :placeholder="t('featured.form.pick')" size="xl" class="w-full" @update:model-value="$emit('change', { shopId: String($event) })" />
    </UFormField>
    <UFormField v-else :label="t('featured.form.item')" :description="t('featured.form.itemHint')" name="hitItemId">
      <USelect :model-value="form.hitItemId" :items="[...itemOptions]" :placeholder="t('featured.form.pick')" size="xl" class="w-full" @update:model-value="$emit('change', { hitItemId: String($event) })" />
    </UFormField>
    <div class="grid gap-5 sm:grid-cols-2">
      <UFormField :label="t('featured.form.start')" name="startDate">
        <UInput :model-value="form.startDate" type="date" size="xl" class="w-full" :ui="{ base: 'min-h-11' }" @update:model-value="$emit('change', { startDate: String($event) })" />
      </UFormField>
      <UFormField :label="t('featured.form.end')" :description="t('featured.form.endHint')" name="endDate">
        <UInput :model-value="form.endDate" type="date" size="xl" class="w-full" :ui="{ base: 'min-h-11' }" @update:model-value="$emit('change', { endDate: String($event) })" />
      </UFormField>
    </div>
    <UFormField :label="t('featured.form.note')" :hint="t('featured.form.noteHint')" name="note">
      <UTextarea :model-value="form.note" :maxlength="FEATURED_NOTE_MAX_LENGTH" :rows="2" autoresize class="w-full" @update:model-value="$emit('change', { note: String($event) })" />
    </UFormField>
    <p v-if="fullDays.length > 0" role="alert" class="text-[0.9375rem] text-error">{{ t('featured.form.fullDays', { days: fullDays.map(dayLabel).join(', ') }) }}</p>
    <ActionButton role="primary" type="submit" :label="t('featured.form.launch')" :loading="saving" :disabled="!canLaunch" class="self-start" />
  </form>
</template>
