<script setup lang="ts">
definePageMeta({ path: '/entrar', layout: 'entry' })

const { t } = useI18n()
useHead({ title: () => `${t('signIn.title')} · ${t('app.surface')}` })

const screen = useSignInScreen()
</script>

<template>
  <div class="flex flex-col gap-8">
    <PageTitle :title="t('signIn.title')" :lead="t('signIn.lead')" />
    <SignInForm
      :form="screen.form"
      :submitting="screen.submitting"
      :error-code="screen.errorCode"
      :captcha-reset-key="screen.captchaResetKey"
      @change="screen.change"
      @captcha="screen.setCaptcha"
      @submit="screen.submit"
    />
  </div>
</template>
