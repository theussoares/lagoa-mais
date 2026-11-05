<script setup lang="ts">
import type { CheckInPosterModel } from '../../types/poster'
import { POSTER_NAME_CLASSES, POSTER_THEME_CLASSES } from '../../utils/posterTheme'

interface Props {
  poster: CheckInPosterModel
}

defineProps<Props>()
</script>

<template>
  <!-- Cartaz impresso (A4): sempre tinta em papel branco, também no tema escuro. Medidas em cqw: a prévia e o papel saem iguais. -->
  <article class="poster-sheet @container relative mx-auto flex aspect-[210/297] w-full max-w-[460px] flex-col overflow-hidden rounded-(--radius-card) bg-white text-center text-black shadow-(--lagoa-shadow-card) print:max-w-none print:rounded-none print:shadow-none">
    <header class="flex flex-col items-center px-[7cqw] pt-[5.5cqw] pb-[11cqw] text-white" :class="POSTER_THEME_CLASSES[poster.theme].band">
      <p class="letreiro text-[3cqw] tracking-[0.16em]">
        <span class="opacity-90">{{ poster.brand }}</span>
        <span class="mx-[1.4cqw] opacity-50" aria-hidden="true">·</span>
        <span class="text-sol-200">{{ poster.eyebrow }}</span>
      </p>
      <h2 class="font-display mt-[3cqw] leading-[1.02] font-bold text-balance break-words" :class="POSTER_NAME_CLASSES[poster.nameScale]">{{ poster.shopName }}</h2>
      <p class="mt-[2.5cqw] text-[3.6cqw] text-white/90">{{ poster.goal }}</p>
      <p class="font-display text-[6.4cqw] leading-tight font-bold text-sol-200 text-balance">{{ poster.rewardTitle }}</p>
      <ClubSetupPosterStamps v-if="poster.stampSlots > 0" :slots="poster.stampSlots" class="mt-[3cqw]" />
    </header>

    <div class="relative z-10 -mt-[8cqw] flex flex-col items-center px-[7cqw]">
      <div class="rounded-[3.5cqw] border-[0.5cqw] bg-white p-[2cqw] shadow-[0_1.5cqw_4cqw_rgb(0_0_0/0.18)] print:shadow-none" :class="POSTER_THEME_CLASSES[poster.theme].accent">
        <svg :viewBox="`0 0 ${poster.qr.size} ${poster.qr.size}`" class="aspect-square w-[44cqw] text-black" role="img" :aria-label="poster.qrLabel" shape-rendering="crispEdges">
          <rect :width="poster.qr.size" :height="poster.qr.size" class="fill-white" />
          <path :d="poster.qr.d" fill="currentColor" />
        </svg>
      </div>
    </div>

    <ClubSetupPosterSteps :steps="poster.steps" :step-class="POSTER_THEME_CLASSES[poster.theme].step" class="mt-[4cqw] px-[6cqw]" />

    <footer class="mt-auto flex flex-col items-center gap-[0.5cqw] border-t border-dashed border-black/30 px-[7cqw] py-[2.6cqw]">
      <p class="text-[2.8cqw] text-black/80">{{ poster.codeLabel }}</p>
      <p class="tabular text-[6.4cqw] leading-none font-bold tracking-[0.22em]">{{ poster.code }}</p>
    </footer>
  </article>
</template>

<style>
@media print {
  @page {
    size: A4;
    margin: 0;
  }
  html,
  body {
    background: #fff !important;
  }
  .poster-sheet {
    width: 210mm;
    height: 297mm;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
}
</style>
