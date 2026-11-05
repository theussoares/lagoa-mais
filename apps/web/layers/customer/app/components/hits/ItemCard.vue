<script setup lang="ts">
import type { HitItemCardModel } from '../../types/hits'

interface Props {
  item: HitItemCardModel
}

defineProps<Props>()
const { t } = useI18n()
</script>

<template>
  <article class="card flex h-full flex-col overflow-hidden">
    <img :src="item.photoUrl" alt="" loading="lazy" class="aspect-square w-full bg-(--color-tinta-100) object-cover dark:bg-(--color-tinta-900)" />
    <div class="flex flex-1 flex-col gap-1 px-3 pt-3 pb-3">
      <h3 class="text-base leading-snug font-semibold text-balance text-highlighted">{{ item.title }}</h3>
      <p class="truncate text-sm text-muted">{{ item.shopName }}</p>
      <PriceTag
        :price="item.price.price"
        :original="item.price.original"
        :discount="item.price.discount"
        :from-label="t('hitPrice.from')"
        :to-label="t('hitPrice.to')"
        class="font-display mt-1 text-lg font-bold text-highlighted"
      />
      <ul v-if="item.tags.length > 0" class="flex flex-wrap gap-2">
        <li v-for="tag in item.tags" :key="tag.tag"><StampTag :label="tag.label" tone="reward" /></li>
      </ul>
      <p v-if="item.earning" class="flex flex-wrap gap-1">
        <span class="rounded-full bg-(--color-sol-100) px-2 py-0.5 text-sm font-bold text-(--color-sol-900) dark:bg-(--color-sol-900) dark:text-(--color-sol-200)">
          {{ item.earning.label }}
        </span>
        <span v-if="item.earning.doubled" class="rounded-full bg-(--color-sol-400) px-2 py-0.5 text-sm font-bold text-(--color-sol-900)">
          {{ item.earning.doubled }}
        </span>
      </p>
      <ActionButton
        v-if="item.contact"
        role="secondary"
        :to="item.contact.href"
        target="_blank"
        rel="noopener noreferrer nofollow"
        external
        block
        :icon="item.contact.icon"
        :label="item.contact.label"
        :aria-label="item.contact.accessibleLabel"
        class="mt-auto min-h-11"
      />
    </div>
  </article>
</template>
