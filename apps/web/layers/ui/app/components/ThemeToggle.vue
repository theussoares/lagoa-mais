<script setup lang="ts">
import type { ThemeToggleLabels } from '../types/theme'

interface Props {
  labels: ThemeToggleLabels
}

const props = defineProps<Props>()

const theme = useThemePreference()

const isDark = computed(() => theme.value === 'dark')
const label = computed(() => (isDark.value ? props.labels.switchToLight : props.labels.switchToDark))

function toggleTheme(): void {
  theme.value = isDark.value ? 'light' : 'dark'
}
</script>

<template>
  <button
    type="button"
    class="group relative flex size-11 min-h-11 min-w-11 items-center justify-center rounded-xl bg-(--ui-bg)/80 border border-(--ui-border) text-(--ui-text-toned) shadow-xs backdrop-blur-md transition-all duration-200 hover:bg-(--ui-bg-elevated) hover:text-(--ui-text-highlighted) active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary cursor-pointer print:hidden"
    :aria-label="label"
    :title="label"
    @click="toggleTheme"
  >
    <UIcon
      name="i-ph-moon"
      class="hidden dark:inline-block size-5 transition-transform duration-200 group-hover:scale-110"
      aria-hidden="true"
    />
    <UIcon
      name="i-ph-sun"
      class="inline-block dark:hidden size-5 transition-transform duration-200 group-hover:scale-110"
      aria-hidden="true"
    />
  </button>
</template>
