<script setup lang="ts">
interface Props {
  /** O que se paga: o preço de agora ou "Sob consulta". */
  price: string
  /** O preço antigo, que vem riscado; `null` sem promoção. */
  original?: string | null
  /** "-12%"; só aparece com o preço antigo. */
  discount?: string | null
  /** "de" e "por": a leitura da promoção sem depender do risco. */
  fromLabel?: string
  toLabel?: string
}

withDefaults(defineProps<Props>(), { original: null, discount: null, fromLabel: '', toLabel: '' })
</script>

<template>
  <!-- A fonte e o tamanho vêm de quem usa; o preço antigo é sempre menor e apagado. -->
  <div class="flex flex-wrap items-baseline gap-x-2 gap-y-1 tabular-nums">
    <!-- Rótulo e preço em flex com gap: espaço em branco no fim de um elemento some na compilação do Vue. -->
    <p v-if="original" class="flex items-baseline gap-1 text-sm font-normal text-muted">
      <span v-if="fromLabel">{{ fromLabel }}</span>
      <s>{{ original }}</s>
    </p>
    <p class="flex items-baseline gap-1">
      <span v-if="original && toLabel" class="text-sm font-normal text-muted">{{ toLabel }}</span>
      <span>{{ price }}</span>
    </p>
    <StampTag v-if="original && discount" :label="discount" tone="success" />
  </div>
</template>
