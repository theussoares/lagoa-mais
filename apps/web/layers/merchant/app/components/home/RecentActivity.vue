<script setup lang="ts">
import type { HomeActivityRowModel } from '../../types/home'

interface Props {
  rows: readonly HomeActivityRowModel[]
}

defineProps<Props>()

const { t } = useI18n()
</script>

<template>
  <section class="bg-(--ui-bg) rounded-2xl p-5 border border-(--ui-border-muted) shadow-(--lagoa-shadow-card) flex flex-col transition-all duration-200 hover:border-(--ui-border)">
    <header class="flex items-center justify-between pb-3">
      <h2 class="text-base font-bold text-(--ui-text-highlighted)">
        {{ t('home.recentActivity.title') }}
      </h2>
      <NuxtLink
        to="/clientes"
        class="group no-underline hover:no-underline inline-flex min-h-11 items-center gap-1.5 text-xs font-semibold text-primary hover:bg-primary/10 px-2.5 -mr-2 rounded-lg transition-all duration-150"
      >
        <span>{{ t('home.recentActivity.seeAll') }}</span>
        <UIcon name="i-ph-arrow-right" class="size-3 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
      </NuxtLink>
    </header>

    <div v-if="rows.length === 0" class="py-10 text-center flex flex-col items-center justify-center">
      <div class="size-12 rounded-full bg-(--ui-bg-elevated) text-(--ui-text-muted) flex items-center justify-center mb-3">
        <UIcon name="i-ph-clock-counter-clockwise" class="size-6" aria-hidden="true" />
      </div>
      <p class="text-sm font-semibold text-(--ui-text-toned)">
        {{ t('home.recentActivity.empty') }}
      </p>
      <p class="mt-1 text-xs text-(--ui-text-muted) max-w-xs">
        {{ t('home.recentActivity.emptyHint') }}
      </p>
    </div>

    <ul v-else class="divide-y divide-(--ui-border-muted)">
      <li v-for="row in rows" :key="row.id">
        <NuxtLink
          :to="row.to"
          class="group no-underline hover:no-underline flex items-center justify-between py-3 -mx-2 px-2.5 rounded-xl transition-all duration-150 hover:bg-primary/5 active:scale-[0.99]"
        >
          <div class="flex items-center gap-3 min-w-0 pr-3">
            <div
              class="size-9.5 rounded-full flex items-center justify-center font-bold text-xs shrink-0 select-none"
              :class="[row.avatarBg, row.avatarText]"
            >
              {{ row.initials }}
            </div>

            <div class="min-w-0 flex flex-col">
              <div class="flex items-center gap-1.5 truncate">
                <span class="truncate text-sm font-semibold text-(--ui-text-highlighted) group-hover:text-primary transition-colors">
                  {{ row.customerName }}
                </span>
                <span v-if="row.maskedPhone" class="text-xs text-(--ui-text-muted) font-mono shrink-0">
                  · {{ row.maskedPhone }}
                </span>
              </div>

              <div class="flex items-center gap-1 text-xs text-(--ui-text-muted) truncate mt-0.5">
                <UIcon :name="row.icon" class="size-3.5 shrink-0" :class="row.iconColor" aria-hidden="true" />
                <span class="truncate font-medium text-(--ui-text-toned)">{{ row.label }}</span>
                <span class="text-(--ui-border)">·</span>
                <span class="text-(--ui-text-muted) tabular-nums shrink-0">{{ row.sub }}</span>
              </div>
            </div>
          </div>

          <div class="flex items-center gap-2 shrink-0">
            <span class="text-xs text-(--ui-text-muted) whitespace-nowrap tabular-nums">
              {{ row.relativeTime }}
            </span>
            <UIcon name="i-ph-caret-right" class="size-4 text-(--ui-text-muted) group-hover:text-primary group-hover:translate-x-0.5 transition-all duration-150" aria-hidden="true" />
          </div>
        </NuxtLink>
      </li>
    </ul>
  </section>
</template>

