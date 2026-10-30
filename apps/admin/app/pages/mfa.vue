<script setup lang="ts">
definePageMeta({ path: '/autenticador', layout: 'entry' })

const { t } = useI18n()
useHead({ title: () => `${t('mfa.title')} · ${t('app.surface')}` })

const screen = useMfaScreen()
</script>

<template>
  <div class="flex flex-col gap-8">
    <PageTitle :title="t(screen.step === 'enroll' ? 'mfa.enroll.title' : 'mfa.title')" :lead="t(screen.step === 'enroll' ? 'mfa.enroll.lead' : 'mfa.lead')" />
    <USkeleton v-if="screen.loading" class="h-64 w-full" />
    <MfaEnroll v-else-if="screen.enrollment" :enrollment="screen.enrollment" />
    <MfaCodeForm
      :code="screen.code"
      :submitting="screen.submitting"
      :error-code="screen.errorCode"
      :submit-label="t('mfa.submit')"
      @update:code="screen.setCode"
      @submit="screen.submit"
    />
    <ActionButton role="quiet" :label="t('nav.signOut')" class="self-center" @click="screen.signOut" />
  </div>
</template>
