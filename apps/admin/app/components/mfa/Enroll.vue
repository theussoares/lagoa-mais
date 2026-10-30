<script setup lang="ts">
import type { AdminMfaEnrollment } from '#shared/schemas/admin'

interface Props {
  enrollment: AdminMfaEnrollment
}

defineProps<Props>()
const { t } = useI18n()
</script>

<template>
  <div class="flex flex-col gap-4">
    <ol class="flex list-decimal flex-col gap-2 pl-5 text-pretty text-default">
      <li>{{ t('mfa.enroll.step1') }}</li>
      <li>{{ t('mfa.enroll.step2') }}</li>
      <li>{{ t('mfa.enroll.step3') }}</li>
    </ol>
    <img :src="enrollment.qrSvg" :alt="t('mfa.enroll.qrAlt')" class="size-48 self-center rounded-(--radius-card) bg-white p-2" >
    <p class="text-[0.9375rem] text-toned">{{ t('mfa.enroll.secret') }}</p>
    <code class="break-all rounded-(--radius-card) border border-(--lagoa-rule) px-3 py-2 font-mono text-base select-all">{{ enrollment.secret }}</code>
  </div>
</template>
