<script setup lang="ts">
import type { ThemeToggleLabels } from '#layers/ui/app/types/theme'

interface Props {
  shopName?: string | null
  themeToggleLabels: ThemeToggleLabels
}

defineProps<Props>()
</script>

<template>
  <header class="dark sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-white/10 bg-(--lagoa-desk) px-4 pt-[max(env(safe-area-inset-top),0.625rem)] pb-2.5 text-default lg:hidden print:hidden">
    <div class="flex min-w-0 items-center gap-2">
      <div class="shrink-0 rounded-lg border-[1.5px] border-cyan-400/90 px-2 py-0.5 text-xs font-extrabold tracking-wider text-cyan-400">
        LAGOA+
      </div>
      <div
        v-if="shopName"
        class="flex min-w-0 items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.05] px-2 py-1 shadow-xs"
        :title="shopName"
      >
        <UIcon name="i-ph-storefront-fill" class="size-3.5 shrink-0 text-cyan-400" aria-hidden="true" />
        <span class="font-display truncate text-xs font-bold text-white tracking-tight">
          {{ shopName }}
        </span>
      </div>
    </div>
    <ThemeToggle :labels="themeToggleLabels" />
  </header>
</template>

