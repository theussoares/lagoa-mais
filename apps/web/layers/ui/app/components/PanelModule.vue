<script setup lang="ts">
interface Props {
  title: string
}

defineProps<Props>()

const headingId = useId()
</script>

<template>
  <section :aria-labelledby="headingId" class="card">
    <header class="flex min-h-12 flex-wrap items-center justify-between gap-2 sm:gap-3 border-b border-(--lagoa-rule) px-3.5 sm:px-4 py-2.5">
      <h2 :id="headingId" class="letreiro text-base text-highlighted">{{ title }}</h2>
      <div class="flex flex-wrap items-center gap-2">
        <slot name="actions" />
      </div>
    </header>
    <div class="p-3.5 sm:p-4">
      <slot />
    </div>
  </section>
</template>
