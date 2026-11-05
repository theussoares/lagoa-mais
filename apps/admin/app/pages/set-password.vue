<script setup lang="ts">
definePageMeta({ path: '/definir-senha', layout: 'entry' })

const { t } = useI18n()
useHead({ title: () => `${t('setPassword.title')} · ${t('app.surface')}` })

const screen = useSetPasswordScreen()
</script>

<template>
  <div class="flex flex-col gap-8">
    <PageTitle :title="t('setPassword.title')" :lead="t('setPassword.lead')" />
    <InkNote v-if="screen.link?.status === 'invalid'" tone="error" :description="t('auth.errors.linkExpired')" />
    <InkNote v-else-if="screen.done" tone="success" :description="t('setPassword.done')" :actions="[{ label: t('signIn.submit'), to: '/entrar' }]" />
    <SetPasswordForm
      v-else-if="screen.link"
      :form="screen.form"
      :submitting="screen.submitting"
      :error-key="screen.errorCode ? `auth.errors.${screen.errorCode}` : null"
      :submit-label="t('setPassword.submit')"
      @change="screen.change"
      @submit="screen.submit"
    >
      <template v-if="screen.needsCode">
        <p class="text-pretty text-toned">{{ t('setPassword.codeLead') }}</p>
        <CurrentCodeField :code="screen.code" :label="t('auth.currentCode')" @update:code="screen.setCode" />
      </template>
    </SetPasswordForm>
  </div>
</template>
