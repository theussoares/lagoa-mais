<script setup lang="ts">
import { HIT_ITEM_TAGS_MAX } from '#shared/constants/domain'
import { HIT_TAGS, type HitTag } from '#shared/domain/hitTag'

interface Props {
  selected: readonly HitTag[]
}

interface Emits {
  (event: 'toggle', tag: HitTag): void
}

defineProps<Props>()
defineEmits<Emits>()
const { t } = useI18n()
</script>

<template>
  <fieldset class="flex flex-col gap-1">
    <legend class="text-base font-medium text-highlighted">{{ t('merchantHits.fields.tags.legend') }}</legend>
    <p class="text-[0.9375rem] text-toned">{{ t('merchantHits.fields.tags.hint', { max: HIT_ITEM_TAGS_MAX }) }}</p>
    <label
      v-for="tag in HIT_TAGS"
      :key="tag"
      class="flex min-h-11 items-center gap-3 text-base"
      :class="!selected.includes(tag) && selected.length >= HIT_ITEM_TAGS_MAX ? 'cursor-not-allowed text-muted' : 'cursor-pointer'"
    >
      <input
        type="checkbox"
        class="size-5 accent-(--ui-primary)"
        :checked="selected.includes(tag)"
        :disabled="!selected.includes(tag) && selected.length >= HIT_ITEM_TAGS_MAX"
        @change="$emit('toggle', tag)"
      >
      {{ t(`hitTags.${tag}`) }}
    </label>
  </fieldset>
</template>
