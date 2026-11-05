<script setup lang="ts">
definePageMeta({ path: '/destaques', layout: 'admin' })

const { t } = useI18n()
useHead({ title: () => `${t('featured.title')} · ${t('app.surface')}` })

const screen = useFeaturedScreen()
</script>

<template>
  <div class="mx-auto flex w-full max-w-[1200px] flex-col gap-6">
    <PageTitle :title="t('featured.title')" :lead="t('featured.lead')">
      <template #actions>
        <div class="flex gap-2" role="group" :aria-label="t('featured.surfaceLabel')">
          <ActionButton v-for="surface in (['discoverCarousel', 'hitsBanner'] as const)" :key="surface" :role="screen.surface === surface ? 'primary' : 'quiet'" :label="t(`featured.surfaces.${surface}`)" :aria-pressed="screen.surface === surface" @click="screen.switchSurface(surface)" />
        </div>
      </template>
    </PageTitle>
    <InkNote v-if="screen.message" :tone="screen.message.tone" :description="t(screen.message.key)" :live="screen.message.tone === 'error'" />
    <InkNote v-if="screen.loadError" tone="error" :description="t(`errors.${screen.loadError}`)" live />
    <div class="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_420px]">
      <PanelModule :title="t('featured.agenda.title')">
        <USkeleton v-if="screen.loading" class="h-56 w-full" />
        <FeaturedAgenda v-else :days="screen.days" :full-days="screen.fullDays" />
      </PanelModule>
      <PanelModule :title="t('featured.form.title')">
        <FeaturedForm :surface="screen.surface" :form="screen.form" :shop-options="screen.shopOptions" :item-options="screen.itemOptions" :full-days="screen.fullDays" :can-launch="screen.canLaunch" :saving="screen.saving" @change="screen.change" @launch="screen.launch" />
      </PanelModule>
    </div>
    <PanelModule :title="t('featured.list.title')"><FeaturedList :placements="screen.placements" :busy-id="screen.busyId" @cancel="screen.cancel" /></PanelModule>
    <PanelModule v-if="screen.surface === 'discoverCarousel'" :title="t('featured.pro.title')">
      <p class="mb-3 text-toned">{{ t('featured.pro.lead') }}</p>
      <p>{{ screen.proShops.length > 0 ? screen.proShops.map((shop) => shop.name).join(' · ') : t('featured.pro.empty') }}</p>
    </PanelModule>
  </div>
</template>
