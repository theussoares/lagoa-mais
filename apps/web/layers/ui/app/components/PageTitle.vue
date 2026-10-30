<script setup lang="ts">
interface Props {
  title: string
  lead?: string
  headingId?: string
  /** Passo a passo move o foco para o título ao trocar de etapa (`focus()` exposto). */
  focusable?: boolean
}

defineProps<Props>()

const heading = useTemplateRef<HTMLHeadingElement>('heading')

defineExpose({ focus: (): void => heading.value?.focus() })
</script>

<template>
  <header class="flex flex-col gap-2.5 sm:gap-3">
    <div class="ledger-rule flex min-h-11 sm:min-h-12 flex-wrap items-end justify-between gap-x-4 gap-y-2">
      <h1 :id="headingId" ref="heading" class="type-title text-[1.75rem] sm:text-[2.25rem] focus:outline-none" :tabindex="focusable ? -1 : undefined">{{ title }}</h1>
      <slot name="actions" />
    </div>
    <p v-if="lead" class="type-lead text-sm sm:text-base">{{ lead }}</p>
    <!-- Apoio com marcação (telefone em destaque, link) que não cabe numa string. -->
    <slot />
  </header>
</template>
