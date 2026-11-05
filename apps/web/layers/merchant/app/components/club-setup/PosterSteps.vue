<script setup lang="ts">
interface Props {
  steps: readonly string[]
  /** Cor do número, vinda do tema do cartaz. */
  stepClass: string
}

defineProps<Props>()
</script>

<template>
  <ol class="grid grid-cols-3 gap-[3cqw]">
    <li v-for="(step, index) in steps" :key="step" class="flex flex-col items-center gap-[1.6cqw]">
      <span class="grid size-[7cqw] place-items-center rounded-full text-[3.6cqw] font-bold text-white" :class="stepClass" aria-hidden="true">{{ index + 1 }}</span>
      <span class="text-[3cqw] leading-snug text-pretty">{{ step }}</span>
    </li>
  </ol>
</template>
