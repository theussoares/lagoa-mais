<script setup lang="ts">
definePageMeta({ path: '/cartaz', layout: 'merchant', middleware: 'merchant-auth' })

usePageTitle('merchantPoster.pageTitle')
const screen = usePosterScreen()
</script>

<template>
  <div class="mx-auto grid w-full max-w-[1200px] items-start gap-8 lg:grid-cols-12 print:block">
    <section class="flex flex-col gap-5 lg:col-span-5 print:hidden">
      <PageTitle :title="$t('merchantPoster.title')" :lead="$t('merchantPoster.lead')" />
      <div class="flex flex-wrap gap-3">
        <UButton size="lg" icon="i-ph-printer" :label="$t('merchantPoster.print')" :disabled="!screen.poster" @click="screen.print" />
        <UButton size="lg" variant="outline" color="neutral" icon="i-ph-download-simple" :label="$t('merchantPoster.download')" :disabled="!screen.poster" @click="screen.download" />
      </div>
      <p class="text-muted">{{ $t('merchantPoster.hint') }}</p>
    </section>

    <div class="lg:col-span-7">
      <div v-if="screen.status === 'loading'" role="status" :aria-label="$t('common.loading')">
        <USkeleton class="mx-auto aspect-[210/297] w-full max-w-[460px] rounded-(--radius-card)" />
      </div>
      <InkNote
        v-else-if="screen.status === 'error'"
        tone="error"
        icon="i-ph-warning-circle"
        :description="$t('merchantPoster.loadError')"
        :actions="[{ label: $t('common.retry'), onClick: screen.reload }]"
        live
      />
      <ClubSetupPoster v-else-if="screen.poster" :poster="screen.poster" />
    </div>
  </div>
</template>
