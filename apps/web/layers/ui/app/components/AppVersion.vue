<script setup lang="ts">
interface Props {
  /** Versão já formatada (`v0.2.2`). */
  label: string
  /** Commit curto, só fora de produção. */
  commit?: string
  /** Texto lido por leitor de tela antes do número. */
  caption: string
}

withDefaults(defineProps<Props>(), { commit: '' })
</script>

<template>
  <p class="text-xs tabular-nums text-toned">
    <span class="sr-only">{{ caption }}{{ ' ' }}</span>{{ label }}<template v-if="commit"> · {{ commit }}</template>
  </p>
</template>
