<script setup lang="ts">
const { t } = useI18n()
</script>

<template>
  <div class="flex flex-col gap-4 sm:gap-6" role="status" :aria-label="t('common.loading')">
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
      <USkeleton v-for="index in 4" :key="index" class="h-28 sm:h-32 rounded-2xl" />
    </div>
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 items-start">
      <div class="flex flex-col gap-4 sm:gap-6">
        <USkeleton class="h-80 rounded-2xl" />
        <USkeleton class="h-44 rounded-2xl" />
      </div>
      <div class="flex flex-col gap-4 sm:gap-6">
        <USkeleton class="h-80 rounded-2xl" />
        <USkeleton class="h-44 rounded-2xl" />
      </div>
    </div>
  </div>
</template>

