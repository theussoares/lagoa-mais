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
  <!-- Índice da caderneta: uma linha pautada por página; a página aberta leva um carimbinho de tinta. -->
  <nav :aria-label="label" class="flex flex-1 flex-col">
    <ul
      v-for="(section, index) in sections"
      :key="index"
      class="flex flex-col border-t border-white/10"
      :class="{ 'mt-auto pt-4': index > 0 }"
    >
      <li v-for="item in section" :key="item.to" class="border-b border-white/10">
        <NuxtLink v-slot="{ href, navigate, isActive }" :to="item.to" custom>
          <a
            :href="href ?? item.to"
            :aria-current="isActive ? 'page' : undefined"
            class="group flex min-h-12 items-center gap-3 px-2.5 py-2.5 text-[0.9375rem] transition-colors duration-150 cursor-pointer"
            :class="isActive ? 'font-bold text-white' : 'text-slate-300/80 hover:text-white'"
            @click="navigate"
          >
            <UIcon
              :name="item.icon"
              class="size-5 shrink-0 transition-colors duration-150"
              :class="isActive ? 'text-cyan-400' : 'text-slate-400 group-hover:text-slate-200'"
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
