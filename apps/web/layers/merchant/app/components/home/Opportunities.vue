<script setup lang="ts">
import type { HomeOpportunityModel } from '../../types/home'

interface Props {
  alerts: readonly HomeOpportunityModel[]
}

defineProps<Props>()

const { t } = useI18n()
</script>

<template>
  <section class="bg-(--ui-bg) rounded-2xl p-5 border border-(--ui-border-muted) shadow-(--lagoa-shadow-card) flex flex-col transition-all duration-200 hover:border-(--ui-border)">
    <header class="flex items-center justify-between pb-3">
      <div class="flex items-center gap-2">
        <UIcon name="i-ph-lightning" class="size-4.5 text-primary" aria-hidden="true" />
        <h2 class="text-base font-bold text-(--ui-text-highlighted)">
          {{ t('home.opportunities.title') }}
        </h2>
      </div>
      <NuxtLink
        to="/clientes"
        class="group no-underline hover:no-underline inline-flex min-h-11 items-center gap-1.5 text-xs font-semibold text-primary hover:bg-primary/10 px-2.5 -mr-2 rounded-lg transition-all duration-150"
      >
        <span>{{ t('home.opportunities.seeAll') }}</span>
        <UIcon name="i-ph-arrow-right" class="size-3 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
      </NuxtLink>
    </header>

    <div v-if="alerts.length === 0" class="py-6 text-center flex flex-col items-center justify-center">
      <div class="size-11 rounded-full bg-success/10 text-success flex items-center justify-center mb-2.5">
        <UIcon name="i-ph-check-circle" class="size-5.5" aria-hidden="true" />
      </div>
      <p class="text-sm font-semibold text-(--ui-text-toned)">
        {{ t('home.opportunities.empty') }}
      </p>
      <p class="mt-1 text-xs text-(--ui-text-muted) max-w-xs">
        {{ t('home.opportunities.emptyHint') }}
      </p>
    </div>

    <ul v-else class="flex flex-col gap-2.5">
      <li v-for="item in alerts" :key="item.id">
        <NuxtLink
          :to="item.to"
          class="group no-underline hover:no-underline flex items-center justify-between gap-3 p-3 rounded-xl border border-(--ui-border-muted) bg-(--ui-bg-muted) hover:border-primary/30 hover:bg-primary/5 hover:shadow-xs transition-all duration-150 active:scale-[0.99]"
        >
          <div class="flex items-center gap-3 min-w-0">
            <div class="size-10 rounded-full flex items-center justify-center shrink-0" :class="item.iconColor">
              <UIcon :name="item.icon" class="size-5" aria-hidden="true" />
            </div>
            <span class="truncate text-sm font-semibold text-(--ui-text-highlighted) group-hover:text-primary transition-colors">
              {{ item.title }}
            </span>
          </div>

          <div class="flex items-center gap-2 shrink-0">
            <span class="text-xs font-bold px-2.5 py-0.5 rounded-full tabular-nums" :class="item.badgeClass">
              {{ item.count }}
            </span>
            <UIcon name="i-ph-caret-right" class="size-4 text-(--ui-text-muted) group-hover:text-primary group-hover:translate-x-0.5 transition-all duration-150" aria-hidden="true" />
          </div>
        </NuxtLink>
      </li>
    </ul>
  </section>
</template>

