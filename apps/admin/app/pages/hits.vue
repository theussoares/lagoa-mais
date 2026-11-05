<script setup lang="ts">
definePageMeta({ path: '/hits', layout: 'admin' })

const { t } = useI18n()
useHead({ title: () => `${t('hits.title')} · ${t('app.surface')}` })

const screen = useHitsScreen()
</script>

<template>
  <div class="mx-auto flex w-full max-w-[1200px] flex-col gap-6">
    <PageTitle :title="t('hits.title')" :lead="t('hits.lead')">
      <template #actions>
        <div class="flex gap-2" role="group" :aria-label="t('hits.tabsLabel')">
          <ActionButton v-for="tab in (['pending', 'approved'] as const)" :key="tab" :role="screen.tab === tab ? 'primary' : 'quiet'" :label="t(`hits.tabs.${tab}`)" :aria-pressed="screen.tab === tab" @click="screen.switchTab(tab)" />
        </div>
      </template>
    </PageTitle>
    <InkNote v-if="screen.message" :tone="screen.message.tone" :description="t(screen.message.key)" :live="screen.message.tone !== 'success'" />
    <InkNote v-if="screen.loadError" tone="error" :description="t(`errors.${screen.loadError}`)" live />
    <USkeleton v-if="screen.loading && screen.cards.length === 0" class="h-64 w-full" />
    <p v-else-if="screen.cards.length === 0" class="rounded-(--radius-card) border-2 border-dashed border-(--lagoa-slot) px-4 py-3 text-toned" role="status">{{ t(`hits.empty.${screen.tab}`) }}</p>
    <HitsReviewCard
      v-for="card in screen.cards"
      :key="card.id"
      :card="card"
      :tab="screen.tab"
      :reason="screen.reasons[card.id] ?? ''"
      :reason-missing="screen.reasonMissing === card.id"
      :busy="screen.busyId === card.id"
      @approve="screen.approve(card.id)"
      @reject="screen.reject(card.id)"
      @take-down="screen.takeDown(card.id)"
      @update:reason="screen.setReason(card.id, $event)"
    />
    <ActionButton v-if="screen.hasMore" role="secondary" :label="t('common.loadMore')" :loading="screen.loading" class="self-center" @click="screen.loadMore" />
  </div>
</template>
