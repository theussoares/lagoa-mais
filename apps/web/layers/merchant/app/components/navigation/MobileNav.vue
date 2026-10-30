<script setup lang="ts">
import type { SpineNavItem } from '#layers/ui/app/types/spine'

interface Props {
  items: readonly SpineNavItem[]
  footerItems: readonly SpineNavItem[]
  currentPath: string
  shopName?: string | null
}

const props = defineProps<Props>()
const emit = defineEmits<{ signOut: [] }>()

const { t } = useI18n()
const drawerOpen = ref(false)
const PRIMARY_PATHS = new Set(['/painel', '/balcao', '/clientes', '/programa'])

function isActive(to: string): boolean {
  return props.currentPath === to || props.currentPath.startsWith(`${to}/`)
}

const isSecondaryActive = computed(() =>
  [...props.items, ...props.footerItems].some((item) => !PRIMARY_PATHS.has(item.to) && isActive(item.to)),
)

function tabClass(active: boolean): string[] {
  return [
    'flex h-full min-h-11 flex-col items-center justify-center gap-1 text-xs leading-none transition-colors duration-(--lagoa-dur-fast)',
    active ? 'font-semibold text-primary' : 'font-medium text-muted hover:text-highlighted',
  ]
}

function onSignOut(): void {
  drawerOpen.value = false
  emit('signOut')
}
</script>

<template>
  <nav :aria-label="t('merchantNav.label')" class="fixed inset-x-0 bottom-0 z-30 border-t border-(--lagoa-rule) bg-default pb-[env(safe-area-inset-bottom)] lg:hidden print:hidden">
    <ul class="mx-auto grid h-[4.5rem] max-w-[540px] grid-cols-5 items-stretch px-1">
      <li>
        <NuxtLink to="/painel" :class="tabClass(isActive('/painel'))" :aria-current="isActive('/painel') ? 'page' : undefined">
          <UIcon :name="isActive('/painel') ? 'i-ph-house-fill' : 'i-ph-house'" class="size-5.5" aria-hidden="true" />
          <span>{{ t('nav.home') }}</span>
        </NuxtLink>
      </li>
      <li>
        <NuxtLink to="/clientes" :class="tabClass(isActive('/clientes'))" :aria-current="isActive('/clientes') ? 'page' : undefined">
          <UIcon :name="isActive('/clientes') ? 'i-ph-users-fill' : 'i-ph-users'" class="size-5.5" aria-hidden="true" />
          <span>{{ t('nav.customers') }}</span>
        </NuxtLink>
      </li>
      <li class="flex justify-center">
        <NuxtLink to="/balcao" class="-mt-5 flex flex-col items-center gap-1 text-xs font-semibold text-highlighted" :aria-current="isActive('/balcao') ? 'page' : undefined">
          <span class="grid size-14 place-items-center rounded-full bg-primary text-inverted shadow-(--lagoa-shadow-card) ring-4 ring-(--ui-bg-muted) dark:ring-(--lagoa-desk) transition-transform duration-(--lagoa-dur-fast) active:scale-95">
            <UIcon :name="isActive('/balcao') ? 'i-ph-storefront-fill' : 'i-ph-storefront-bold'" class="size-6.5" aria-hidden="true" />
          </span>
          <span class="leading-none">{{ t('nav.counter') }}</span>
        </NuxtLink>
      </li>
      <li>
        <NuxtLink to="/programa" :class="tabClass(isActive('/programa'))" :aria-current="isActive('/programa') ? 'page' : undefined">
          <UIcon :name="isActive('/programa') ? 'i-ph-seal-fill' : 'i-ph-seal'" class="size-5.5" aria-hidden="true" />
          <span>{{ t('merchantNav.programShort') }}</span>
        </NuxtLink>
      </li>
      <li>
        <button type="button" :class="[...tabClass(isSecondaryActive || drawerOpen), 'w-full cursor-pointer']" :aria-expanded="drawerOpen" @click="drawerOpen = true">
          <UIcon name="i-ph-list" class="size-5.5" aria-hidden="true" />
          <span>{{ t('merchantNav.more') }}</span>
        </button>
      </li>
    </ul>

    <UDrawer v-model:open="drawerOpen" :title="t('merchantNav.moreTitle')">
      <template #content>
        <div class="dark flex flex-col bg-(--lagoa-desk) px-4 pt-4 pb-[max(env(safe-area-inset-bottom),1.25rem)] text-default">
          <div class="mb-4 flex items-center justify-between px-2">
            <div class="flex min-w-0 items-center gap-2">
              <div class="shrink-0 rounded-lg border-[1.5px] border-cyan-400/90 px-2.5 py-0.5 text-xs font-extrabold tracking-wider text-cyan-400">LAGOA+</div>
              <div
                v-if="shopName"
                class="flex min-w-0 items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.05] px-2 py-1 shadow-xs"
                :title="shopName"
              >
                <UIcon name="i-ph-storefront-fill" class="size-3.5 shrink-0 text-cyan-400" aria-hidden="true" />
                <span class="font-display truncate text-xs font-bold text-white tracking-tight">
                  {{ shopName }}
                </span>
              </div>
            </div>
            <button type="button" class="flex size-11 items-center justify-center rounded-full text-slate-300 hover:bg-white/10" :aria-label="t('merchantNav.closeMenu')" @click="drawerOpen = false">
              <UIcon name="i-ph-x" class="size-5" aria-hidden="true" />
            </button>
          </div>
          <div @click="drawerOpen = false">
            <SpineNav :items="items" :footer-items="footerItems" :label="t('merchantNav.label')" />
          </div>
          <button type="button" class="mt-2 flex min-h-12 items-center gap-3 rounded-xl px-2.5 py-2.5 text-[0.9375rem] font-medium text-slate-300/80 transition-colors hover:text-white cursor-pointer" @click="onSignOut">
            <UIcon name="i-ph-sign-out" class="size-5 shrink-0 text-slate-400" aria-hidden="true" />{{ t('merchantNav.signOut') }}
          </button>
        </div>
      </template>
    </UDrawer>
  </nav>
</template>
