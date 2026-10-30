<script setup lang="ts">
definePageMeta({ path: '/minha-conta', layout: 'admin' })

const { t } = useI18n()
useHead({ title: () => `${t('account.title')} · ${t('app.surface')}` })

const screen = useAccountScreen()
</script>

<template>
  <div class="mx-auto flex w-full max-w-[1200px] flex-col gap-6">
    <PageTitle :title="t('account.title')" :lead="screen.name" />
    <div class="grid items-start gap-5 lg:grid-cols-2">
      <PanelModule :title="t('account.password.title')">
        <div class="flex flex-col gap-4">
          <InkNote v-if="screen.passwordMessage" :tone="screen.passwordMessage.tone" :description="t(screen.passwordMessage.key)" :live="screen.passwordMessage.tone === 'error'" />
          <SetPasswordForm :form="screen.password" :submitting="screen.passwordSaving" :error-key="null" :submit-label="t('account.password.save')" @change="screen.changePassword" @submit="screen.savePassword">
            <CurrentCodeField :code="screen.passwordCode" :label="t('auth.currentCode')" :hint="t('auth.currentCodeHint')" @update:code="screen.setPasswordCode" />
          </SetPasswordForm>
        </div>
      </PanelModule>
      <PanelModule :title="t('account.mfa.title')">
        <div class="flex flex-col gap-4">
          <InkNote v-if="screen.mfaMessage" :tone="screen.mfaMessage.tone" :description="t(screen.mfaMessage.key)" :live="screen.mfaMessage.tone === 'error'" />
          <AccountMfaPanel :enrollment="screen.enrollment" :code="screen.mfaCode" :current-code="screen.currentCode" :busy="screen.mfaBusy" @start="screen.startMfa" @confirm="screen.confirmMfa" @cancel="screen.cancelMfa" @update:code="screen.setMfaCode" @update:current-code="screen.setCurrentCode" />
        </div>
      </PanelModule>
    </div>
  </div>
</template>
