<script setup lang="ts">
import type { SpineNavItem } from '#layers/ui/app/types/spine'

const { t } = useI18n()
const route = useRoute()
const { session, signOut } = useMerchantSession()
const shopStatus = useShopStatus()
const { approveForTesting } = shopStatus
const campaignsEnabled = useCampaignsEnabled()

// A rede pode ter aprovado ou suspendido a loja desde o login.
onMounted(() => void shopStatus.refresh())

async function approve(): Promise<void> {
  if (approveForTesting !== null) await approveForTesting()
}

const items = computed<SpineNavItem[]>(() => [
  { label: t('nav.home'), icon: 'i-ph-house', to: '/painel' },
  { label: t('nav.counter'), icon: 'i-ph-storefront', to: '/balcao' },
  { label: t('nav.customers'), icon: 'i-ph-users', to: '/clientes' },
  { label: t('nav.program'), icon: 'i-ph-seal', to: '/programa' },
  { label: t('nav.hits'), icon: 'i-ph-fire', to: '/hits' },
  { label: t('nav.shopLink'), icon: 'i-ph-cursor-click', to: '/botao-do-card' },
  ...(campaignsEnabled ? [{ label: t('nav.campaigns'), icon: 'i-ph-megaphone', to: '/campanhas' }] : []),
])
const footerItems = computed<SpineNavItem[]>(() => [{ label: t('merchantNav.settings'), icon: 'i-ph-gear-six', to: '/configuracoes' }])
const themeToggleLabels = computed(() => ({
  switchToLight: t('theme.switchToLight'),
  switchToDark: t('theme.switchToDark'),
}))
</script>

<template>
  <div class="flex min-h-dvh flex-col bg-(--ui-bg-muted) dark:bg-(--lagoa-desk) text-base [--merchant-sidebar-width:230px] lg:grid lg:grid-cols-[var(--merchant-sidebar-width)_minmax(0,1fr)] print:block">
    <NavigationMobileHeader :shop-name="session?.shopName" :theme-toggle-labels="themeToggleLabels" />

    <!-- A barra lateral em azul-petróleo escuro usando os tokens da paleta (somente desktop) -->
    <aside class="dark hidden print:hidden lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col bg-(--lagoa-desk) border-r border-(--lagoa-rule) px-3.5 py-6 text-default">
      <div class="flex flex-col items-start px-2 pb-6">
        <div class="rounded-lg border-[1.5px] border-cyan-400/90 px-2.5 py-1 text-sm font-extrabold tracking-wider text-cyan-400">
          LAGOA+
        </div>
        <div
          v-if="session"
          class="mt-3.5 flex w-full items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.04] px-2.5 py-2 shadow-xs transition-colors hover:bg-white/[0.07]"
          :title="session.shopName"
        >
          <div class="flex size-7 shrink-0 items-center justify-center rounded-lg bg-cyan-400/15 text-cyan-400 ring-1 ring-cyan-400/30">
            <UIcon name="i-ph-storefront-fill" class="size-4" aria-hidden="true" />
          </div>
          <div class="min-w-0 flex-1">
            <span class="block font-display truncate text-sm font-bold text-white tracking-tight leading-tight">
              {{ session.shopName }}
            </span>
          </div>
        </div>
      </div>
      <SpineNav :items="items" :footer-items="footerItems" :label="t('merchantNav.label')" />
      <button
        type="button"
        class="group mt-1 flex min-h-12 items-center gap-3 rounded-xl px-3 py-2.5 text-[0.9375rem] font-medium text-toned transition-all duration-150 hover:bg-(--ui-bg-elevated) hover:text-highlighted hover:translate-x-1 active:scale-[0.99] cursor-pointer"
        @click="signOut"
      >
        <UIcon name="i-ph-sign-out" class="size-5 shrink-0 text-muted group-hover:text-highlighted group-hover:scale-105 transition-all duration-150" aria-hidden="true" />
        {{ t('merchantNav.signOut') }}
      </button>
    </aside>

    <main id="main" class="min-w-0 flex-1 px-4 pt-4 pb-[calc(env(safe-area-inset-bottom)+6.5rem)] sm:px-6 lg:px-8 lg:py-7">
      <div class="hidden lg:block fixed top-6 right-8 z-50 print:hidden">
        <ThemeToggle :labels="themeToggleLabels" />
      </div>
      <InkNote
        v-if="shopStatus.status.value === 'pending'"
        tone="warning"
        icon="i-ph-hourglass-medium"
        class="mx-auto mb-5 max-w-[1300px] print:hidden"
        :title="t('merchantNav.pending.title')"
        :description="t('merchantNav.pending.description')"
        :actions="approveForTesting ? [{ label: t('merchantNav.pending.approveForTesting'), onClick: approve }] : []"
      />
      <InkNote
        v-else-if="shopStatus.status.value === 'suspended'"
        tone="error"
        icon="i-ph-prohibit"
        class="mx-auto mb-5 max-w-[1300px] print:hidden"
        :title="t('merchantNav.suspended.title')"
        :description="t('errors.shopSuspended')"
      />
      <slot />
    </main>

    <NavigationMobileNav
      :items="items"
      :footer-items="footerItems"
      :current-path="route.path"
      :shop-name="session?.shopName"
      @sign-out="signOut"
    />
  </div>
</template>
