<script setup lang="ts">
definePageMeta({ path: '/lojas/:id', layout: 'admin' })

const { t } = useI18n()
const route = useRoute()
const screen = useShopDetailScreen(String(route.params.id))
useHead({ title: () => `${screen.shop?.name ?? t('shops.title')} · ${t('app.surface')}` })
</script>

<template>
  <div class="mx-auto flex w-full max-w-[1200px] flex-col gap-6">
    <NuxtLink to="/lojas" class="inline-flex min-h-11 items-center gap-2 self-start text-[0.9375rem] text-toned underline">
      <UIcon name="i-ph-arrow-left" aria-hidden="true" />{{ t('shopDetail.back') }}
    </NuxtLink>
    <InkNote v-if="screen.loadError" tone="error" :description="t(`errors.${screen.loadError}`)" live />
    <USkeleton v-if="screen.loading" class="h-64 w-full" />
    <template v-else-if="screen.shop">
      <PageTitle :title="screen.shop.name">
        <template #actions><ShopsStatusBadge :status="screen.shop.status" /></template>
      </PageTitle>
      <InkNote v-if="screen.message" :tone="screen.message.tone" :description="t(screen.message.key)" :live="screen.message.tone === 'error'" />
      <div class="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_400px]">
        <PanelModule :title="t('shopDetail.data')"><ShopDetailSummary :shop="screen.shop" /></PanelModule>
        <PanelModule :title="t('shopDetail.actionsTitle')">
          <ShopDetailActions
            :status="screen.shop.status"
            :plan="screen.shop.plan"
            :reason="screen.reason"
            :reason-missing="screen.reasonMissing"
            :busy="screen.busy"
            @approve="screen.act({ action: 'approve' })"
            @reactivate="screen.act({ action: 'reactivate' })"
            @change-plan="screen.act({ action: 'changePlan', plan: $event })"
            @suspend="screen.suspend"
            @update:reason="screen.setReason"
          />
        </PanelModule>
      </div>
      <PanelModule :title="t('shopDetail.history.title')"><ShopDetailHistory :events="screen.shop.history" /></PanelModule>
    </template>
  </div>
</template>
