<script setup lang="ts">
import type { SetupStepItem } from '../../types/clubSetup'

interface Props {
  shopName: string
  steps: readonly SetupStepItem[]
}

defineProps<Props>()
</script>

<template>
  <header class="flex flex-wrap items-center justify-between gap-3 sm:gap-4 border-b border-(--lagoa-rule) bg-default px-4 py-3.5 sm:px-8 sm:py-4 print:hidden">
    <div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <p class="letreiro text-xl text-highlighted">{{ $t('app.name') }}</p>
      <p class="text-sm sm:text-[0.9375rem] text-muted">
        {{ shopName ? $t('clubSetup.creatingFor', { shop: shopName }) : $t('clubSetup.creating') }}
      </p>
    </div>
    <ClubSetupSteps :steps="steps" />
  </header>
</template>
