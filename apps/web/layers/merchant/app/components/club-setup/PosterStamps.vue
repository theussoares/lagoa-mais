<script setup lang="ts">
interface Props {
  /** Casas desenhadas; a última é o prêmio. */
  slots: number
}

defineProps<Props>()
</script>

<template>
  <!-- Enfeite do cartão de carimbos: o texto do cartaz já diz a meta, então o leitor de tela pula. -->
  <ul class="flex items-center justify-center gap-[1.6cqw]" aria-hidden="true">
    <li v-for="index in slots - 1" :key="index" class="size-[5cqw] rounded-full border-[0.45cqw] border-dashed border-white/70" />
    <li class="grid size-[6.4cqw] place-items-center rounded-full bg-sol-200 text-tinta-950">
      <UIcon name="i-ph-gift-fill" class="size-[3.8cqw]" />
    </li>
  </ul>
</template>
