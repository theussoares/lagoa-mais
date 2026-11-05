<script setup lang="ts">
definePageMeta({ path: '/esqueci-a-senha', layout: 'entry' })

const { t } = useI18n()
useHead({ title: () => `${t('forgot.title')} · ${t('app.surface')}` })

const screen = useForgotPasswordScreen()
</script>

<template>
  <div class="flex flex-col gap-8">
    <PageTitle :title="t('forgot.title')" :lead="t('forgot.lead')" />
    <ForgotPasswordForm
      :email="screen.email"
      :submitting="screen.submitting"
      :sent="screen.sent"
      :error-code="screen.errorCode"
      :captcha-reset-key="screen.captchaResetKey"
      @update:email="screen.setEmail"
      @captcha="screen.setCaptcha"
      @submit="screen.submit"
    />
    <NuxtLink to="/entrar" class="min-h-11 text-center text-[0.9375rem] text-toned underline">{{ t('forgot.back') }}</NuxtLink>
  </div>
</template>
