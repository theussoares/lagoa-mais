<script setup lang="ts">
import type { SpineNavItem } from '#layers/ui/app/types/spine'

const { t } = useI18n()

const items = computed<SpineNavItem[]>(() => [
  { label: t('nav.shops'), icon: 'i-ph-storefront', to: '/lojas' },
  { label: t('nav.hits'), icon: 'i-ph-fire', to: '/hits' },
  { label: t('nav.featured'), icon: 'i-ph-star', to: '/destaques' },
  { label: t('nav.team'), icon: 'i-ph-users-three', to: '/equipe' },
])
const footerItems = computed<SpineNavItem[]>(() => [{ label: t('nav.account'), icon: 'i-ph-user-circle', to: '/minha-conta' }])
</script>

<template>
  <div class="grid min-h-dvh grid-cols-[var(--admin-sidebar-width)_minmax(0,1fr)] text-base [--admin-sidebar-width:220px]">
    <aside class="dark sticky top-0 flex h-dvh flex-col bg-(--lagoa-desk) px-3 py-5 text-default">
      <div class="flex flex-col items-start gap-2 px-2.5 pb-7">
        <p class="letreiro -rotate-3 rounded-[6px] px-2.5 py-1 text-xl text-primary ring-2 ring-current outline-1 outline-offset-2 outline-current/50">
          {{ t('app.name') }}
        </p>
        <p class="mt-2 text-[0.9375rem] text-toned">{{ t('app.surface') }}</p>
      </div>
      <SpineNav :items="items" :footer-items="footerItems" :label="t('nav.label')" />
      <slot name="footer" />
    </aside>
    <main id="main" class="min-w-0 px-8 py-6">
      <slot />
    </main>
  </div>
</template>
