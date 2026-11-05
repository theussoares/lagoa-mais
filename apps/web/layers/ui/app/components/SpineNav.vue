<script setup lang="ts">
import type { SpineNavItem } from '../types/spine'

interface Props {
  items: readonly SpineNavItem[]
  /** Páginas de rodapé (Configurações): mesmo índice, empurradas para o fim da lombada. */
  footerItems?: readonly SpineNavItem[]
  label: string
}

const props = withDefaults(defineProps<Props>(), { footerItems: () => [] })

const sections = computed(() => [props.items, props.footerItems].filter((section) => section.length > 0))
</script>

<template>
  <!-- Navegação lateral: itens com cantos arredondados, fundo escuro e destaque ativo conforme referência visual. -->
  <nav :aria-label="label" class="flex flex-1 flex-col">
    <ul
      v-for="(section, index) in sections"
      :key="index"
      class="flex flex-col"
      :class="index === 0 ? 'gap-2.5' : 'mt-auto pt-4 border-t border-(--lagoa-rule) gap-2'"
    >
      <li v-for="item in section" :key="item.to">
        <NuxtLink v-slot="{ href, navigate, isActive }" :to="item.to" custom>
          <a
            :href="href ?? item.to"
            :aria-current="isActive ? 'page' : undefined"
            class="group flex min-h-12 items-center gap-3 rounded-xl px-3 py-2.5 text-[0.9375rem] transition-all duration-150 cursor-pointer"
            :class="isActive ? 'bg-(--ui-bg-elevated) text-highlighted font-medium shadow-xs hover:bg-(--ui-bg-accented)' : 'text-toned hover:bg-(--ui-bg-elevated)/60 hover:text-highlighted hover:translate-x-1 active:scale-[0.99]'"
            @click="navigate"
          >
            <UIcon
              :name="item.icon"
              class="size-5 shrink-0 transition-all duration-150"
              :class="isActive ? 'text-cyan-400' : 'text-muted group-hover:text-highlighted group-hover:scale-105'"
              aria-hidden="true"
            />
            <span class="min-w-0 flex-1 truncate">{{ item.label }}</span>
            <span
              v-if="isActive"
              aria-hidden="true"
              class="flex size-6 shrink-0 items-center justify-center rounded-full border-[1.5px] border-cyan-400 text-cyan-400"
            >
              <UIcon name="i-ph-check" class="size-3.5" />
            </span>
          </a>
        </NuxtLink>
      </li>
    </ul>
  </nav>
</template>
