<script setup lang="ts">
import type { HomeDiffTone, HomeIndicatorCardModel } from '../../types/home'

interface Props {
  cards: readonly HomeIndicatorCardModel[]
}

defineProps<Props>()

const TONE_CLASS: Record<HomeDiffTone, string> = {
  success: 'text-success',
  error: 'text-error',
  neutral: 'text-(--ui-text-muted)',
}
</script>

<template>
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
    <article
      v-for="card in cards"
      :key="card.id"
      class="bg-(--ui-bg) rounded-2xl p-5 border border-(--ui-border-muted) shadow-(--lagoa-shadow-card) flex flex-col justify-between gap-4 transition-all duration-200 hover:border-(--ui-border)"
    >
      <div class="flex items-center gap-3.5">
        <div class="size-11 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <UIcon :name="card.icon" class="size-5.5" aria-hidden="true" />
        </div>
        <h2 class="text-sm font-medium text-(--ui-text-toned)">
          {{ card.title }}
        </h2>
      </div>

      <div class="flex items-end justify-between gap-2">
        <div class="min-w-0">
          <p class="font-display text-3xl font-extrabold text-(--ui-text-highlighted) tabular-nums tracking-tight">
            {{ card.value }}
          </p>
          <p v-if="card.subtitle" class="mt-1 text-xs text-(--ui-text-muted) truncate">
            {{ card.subtitle }}
          </p>
        </div>

        <div v-if="card.badge" class="text-right pb-0.5 shrink-0">
          <span
            class="inline-flex items-center gap-0.5 text-xs font-semibold tabular-nums"
            :class="TONE_CLASS[card.badge.tone]"
          >
            <UIcon :name="card.badge.icon" class="size-3" aria-hidden="true" />
            {{ card.badge.text }}
          </span>
          <p class="text-[11px] text-(--ui-text-muted)">
            {{ card.badge.label }}
          </p>
        </div>

        <NuxtLink
          v-else-if="card.action"
          :to="card.action.to"
          class="group no-underline hover:no-underline inline-flex min-h-11 items-center gap-1.5 text-xs font-semibold text-primary hover:bg-primary/10 px-2.5 -mr-2 rounded-lg transition-all duration-150 shrink-0"
          :title="card.action.label"
        >
          <span>{{ card.action.label }}</span>
          <UIcon
            name="i-ph-arrow-right"
            class="size-3 transition-transform duration-200 group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </NuxtLink>
      </div>
    </article>
  </div>
</template>

