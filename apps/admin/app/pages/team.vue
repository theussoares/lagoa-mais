<script setup lang="ts">
definePageMeta({ path: '/equipe', layout: 'admin' })

const { t } = useI18n()
useHead({ title: () => `${t('team.title')} · ${t('app.surface')}` })

const screen = useTeamScreen()
</script>

<template>
  <div class="mx-auto flex w-full max-w-[1200px] flex-col gap-6">
    <PageTitle :title="t('team.title')" :lead="t('team.lead')" />
    <InkNote v-if="screen.message" :tone="screen.message.tone" :description="t(screen.message.key)" :live="screen.message.tone === 'error'" />
    <InkNote v-if="screen.loadError" tone="error" :description="t(`errors.${screen.loadError}`)" live />
    <PanelModule :title="t('team.form.title')"><TeamInviteForm :form="screen.form" :inviting="screen.inviting" @change="screen.change" @invite="screen.invite" /></PanelModule>
    <PanelModule :title="t('team.listTitle')">
      <USkeleton v-if="screen.loading" class="h-32 w-full" />
      <TeamList v-else :members="screen.members" :busy-id="screen.busyId" :armed="screen.armed" @act="screen.act" />
    </PanelModule>
  </div>
</template>
