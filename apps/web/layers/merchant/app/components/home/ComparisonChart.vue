<script setup lang="ts">
import type { HomePeriod } from '#shared/schemas/homeOverview'
import type { HomeComparisonBarModel, HomeDiffTone } from '../../types/home'

interface Props {
  comparison: Record<HomePeriod, readonly HomeComparisonBarModel[]>
}

const props = defineProps<Props>()

const { t } = useI18n()

const selectedPeriod = ref<HomePeriod>('month')

const periodTabs = computed(() => [
  { label: t('home.monthSummary.periods.week'), value: 'week' as const },
  { label: t('home.monthSummary.periods.month'), value: 'month' as const },
  { label: t('home.monthSummary.periods.last30'), value: 'last30' as const },
])

const bars = computed(() => props.comparison[selectedPeriod.value] ?? [])

const DIFF_TONE_CLASS: Record<HomeDiffTone, string> = {
  success: 'bg-success/10 text-success',
  error: 'bg-error/10 text-error',
  neutral: 'bg-(--ui-bg-elevated) text-(--ui-text-muted)',
}
</script>

<template>
  <section class="bg-(--ui-bg) rounded-2xl p-5 border border-(--ui-border-muted) shadow-(--lagoa-shadow-card) flex flex-col justify-between transition-all duration-200 hover:border-(--ui-border)">
    <div>
      <header class="flex items-center justify-between pb-1">
        <div>
          <h2 class="text-base font-bold text-(--ui-text-highlighted)">
            {{ t('home.monthSummary.title') }}
          </h2>
          <p class="text-xs text-(--ui-text-muted) mt-0.5">
            {{ t('home.monthSummary.subtitle') }}
          </p>
        </div>

        <NuxtLink
          to="/clientes"
          class="group no-underline hover:no-underline inline-flex min-h-11 items-center gap-1.5 text-xs font-semibold text-primary hover:bg-primary/10 px-2.5 -mr-2 rounded-lg transition-all duration-150"
        >
          <span>{{ t('home.monthSummary.details') }}</span>
          <UIcon name="i-ph-arrow-right" class="size-3 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
        </NuxtLink>
      </header>

      <div class="flex flex-wrap items-center justify-between gap-3 mt-4 pt-1">
        <div role="tablist" :aria-label="t('home.monthSummary.title')" class="flex items-center gap-1 bg-(--ui-bg-elevated) p-1 rounded-xl">
          <button
            v-for="period in periodTabs"
            :key="period.value"
            type="button"
            role="tab"
            :aria-selected="selectedPeriod === period.value"
            class="min-h-11 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-150 cursor-pointer active:scale-95"
            :class="selectedPeriod === period.value
              ? 'bg-(--ui-bg) text-primary shadow-xs hover:shadow-sm'
              : 'text-(--ui-text-muted) hover:text-(--ui-text-highlighted) hover:bg-(--ui-bg-accented)'"
            @click="selectedPeriod = period.value"
          >
            {{ period.label }}
          </button>
        </div>

        <div class="flex items-center gap-4 text-xs font-medium text-(--ui-text-muted)">
          <div class="flex items-center gap-1.5">
            <span class="size-2.5 rounded-full bg-primary" />
            <span>{{ t('home.monthSummary.current') }}</span>
          </div>
          <div class="flex items-center gap-1.5">
            <span class="size-2.5 rounded-full bg-primary/30" />
            <span>{{ t('home.monthSummary.previous') }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="mt-8 pt-2 grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 h-52 px-2 sm:px-4">
      <div v-for="item in bars" :key="item.id" class="flex flex-col items-center justify-end h-full group/col">
        <div class="mb-2 text-center">
          <span
            v-if="item.diffText !== null"
            class="inline-flex items-center gap-0.5 text-[11px] font-bold px-1.5 py-0.5 rounded-full tabular-nums"
            :class="DIFF_TONE_CLASS[item.diffTone]"
          >
            <UIcon :name="item.diffIcon" class="size-2.5" aria-hidden="true" />
            {{ item.diffText }}
          </span>
          <span v-else class="text-[11px] font-medium text-(--ui-text-muted)">—</span>
        </div>

        <div class="w-full flex items-end justify-center gap-1.5 sm:gap-2 h-32">
          <div class="w-1/2 max-w-[28px] flex flex-col items-center justify-end h-full">
            <span class="text-[11px] text-(--ui-text-muted) mb-1 tabular-nums">{{ item.previous }}</span>
            <div class="w-full rounded-t-[4px] bg-primary/30 transition-all duration-300 group-hover/col:brightness-105" :style="{ height: `${item.previousHeight}%` }" :title="item.previousTitle" />
          </div>
          <div class="w-1/2 max-w-[28px] flex flex-col items-center justify-end h-full">
            <span class="text-xs font-bold text-(--ui-text-highlighted) mb-1 tabular-nums">{{ item.current }}</span>
            <div class="w-full rounded-t-[4px] bg-primary transition-all duration-300 group-hover/col:brightness-110" :style="{ height: `${item.currentHeight}%` }" :title="item.currentTitle" />
          </div>
        </div>

        <div class="w-full border-t border-(--ui-border-muted) pt-2 mt-2 text-center">
          <span class="text-xs font-semibold text-(--ui-text-toned) truncate block">{{ item.label }}</span>
        </div>
      </div>
    </div>
  </section>
</template>

