<script setup lang="ts">
interface Props {
  shopName?: string | null
  dateText: string
  loading?: boolean
}

defineProps<Props>()

const emit = defineEmits<{
  (e: 'refresh'): void
}>()

const { t } = useI18n()
</script>

<template>
  <header class="flex flex-col gap-3.5 sm:flex-row sm:items-center sm:justify-between">
    <div class="min-w-0">
      <h1 class="font-display text-2xl sm:text-[1.75rem] font-bold tracking-tight text-(--ui-text-highlighted)">
        {{ t('home.title') }}
      </h1>
      <p class="mt-0.5 text-sm text-(--ui-text-muted)">
        {{ t('home.subtitle') }}
      </p>
    </div>

    <div class="flex flex-wrap items-center justify-between sm:justify-end gap-2.5 sm:gap-4 shrink-0 lg:pr-14">
      <div class="flex flex-wrap items-center gap-2.5 sm:gap-3 min-w-0">
        <!-- Data atual no fuso da cidade -->
        <div class="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-(--ui-text-toned)">
          <UIcon name="i-ph-calendar-blank" class="size-4 sm:size-4.5 shrink-0 text-(--ui-text-muted)" aria-hidden="true" />
          <span class="font-medium">{{ dateText }}</span>
        </div>

        <div v-if="shopName" class="hidden sm:block h-4 w-px bg-(--ui-border)" aria-hidden="true" />

        <!-- Identificação da loja parceira -->
        <div
          v-if="shopName"
          class="hidden sm:flex items-center gap-2 rounded-xl border border-(--lagoa-rule) bg-(--ui-bg-elevated) px-2.5 py-1 text-sm text-(--ui-text-highlighted) shadow-xs"
          :title="shopName"
        >
          <div class="flex size-6 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <UIcon name="i-ph-storefront-fill" class="size-3.5" aria-hidden="true" />
          </div>
          <span class="font-display max-w-[170px] truncate font-bold tracking-tight">{{ shopName }}</span>
        </div>
        <span v-if="shopName" class="sr-only sm:hidden">{{ shopName }}</span>
      </div>

      <div class="flex w-full sm:w-auto items-center gap-2">
        <!-- Atalho direto para o Balcão -->
        <UButton
          to="/balcao"
          size="lg"
          color="primary"
          icon="i-ph-storefront"
          class="min-h-11 flex-1 sm:flex-initial justify-center cursor-pointer"
          :label="t('home.counterAction')"
        />

        <!-- Ação de atualizar -->
        <UButton
          variant="ghost"
          color="neutral"
          icon="i-ph-arrow-clockwise"
          class="size-11 min-h-11 min-w-11 shrink-0 justify-center rounded-lg cursor-pointer transition-all duration-150 hover:bg-(--ui-bg-muted) active:scale-95"
          :aria-label="t('home.refresh')"
          :loading="loading"
          @click="emit('refresh')"
        />
      </div>
    </div>
  </header>
</template>

