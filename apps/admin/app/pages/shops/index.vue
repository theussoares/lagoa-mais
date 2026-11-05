<script setup lang="ts">
definePageMeta({ path: '/lojas', layout: 'admin' })

const { t } = useI18n()
useHead({ title: () => `${t('shops.title')} · ${t('app.surface')}` })

const screen = useShopsScreen()
</script>

<template>
  <div class="mx-auto flex w-full max-w-[1200px] flex-col gap-6">
    <PageTitle :title="t('shops.title')" :lead="t('shops.lead')" />
    <PanelModule :title="t('shops.listTitle')">
      <div class="flex flex-col gap-5">
        <ShopsFilters :status="screen.status" :query="screen.query" :loading="screen.loading" @update:status="screen.setStatus" @update:query="screen.setQuery" @search="screen.search" />
        <InkNote v-if="screen.loadError" tone="error" :description="t(`errors.${screen.loadError}`)" live />
        <USkeleton v-if="screen.loading && screen.shops.length === 0" class="h-40 w-full" />
        <ShopsTable v-else :shops="screen.shops" />
        <ActionButton v-if="screen.hasMore" role="secondary" :label="t('common.loadMore')" :loading="screen.loading" class="self-center" @click="screen.loadMore" />
      </div>
    </PanelModule>
  </div>
</template>
