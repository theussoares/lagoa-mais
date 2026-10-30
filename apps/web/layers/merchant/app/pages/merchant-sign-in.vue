<script setup lang="ts">
import { LOGIN_CODE_LENGTH } from '#shared/constants/domain'
import { formatPhoneInput } from '#shared/utils/phone'
import type { ComponentPublicInstance } from 'vue'
import type { MerchantSignInOutcome } from '../types/signIn'

definePageMeta({ path: '/balcao/entrar', layout: 'merchant-entry', middleware: 'merchant-guest' })

const { t } = useI18n()
const route = useRoute()
useHead({ title: () => `${t('merchantSignIn.pageTitle')} · ${t('app.name')}` })

const { step, pending, error, resendIn, demoEnabled, requestCode, resendCode, verify, signInDemo, changePhone } = useMerchantSignIn()
const { session } = useMerchantSession()
const mockCode = useMockLoginHint()
const mockPhone = useMockMerchantPhone()

const phoneDraft = ref('')
const code = ref<number[]>([])
const codeField = useTemplateRef<ComponentPublicInstance>('codeField')

const steps = computed<[string, string, string]>(() => [
  t('merchantSignIn.steps.phone'),
  t('merchantSignIn.steps.stamp'),
  t('merchantSignIn.steps.redeem'),
])

const errorText = computed(() => (error.value === null ? undefined : t(`errors.${error.value}`)))
const phoneError = computed(() => (step.value.name === 'phone' ? errorText.value : undefined))
const codeError = computed(() => (step.value.name === 'code' ? errorText.value : undefined))
const sentTo = computed(() => (step.value.name === 'code' ? formatPhoneInput(step.value.phone) : ''))

function onPhoneInput(value: string | number): void {
  phoneDraft.value = formatPhoneInput(String(value))
}

async function submitCode(): Promise<void> {
  await finishSignIn(await verify(code.value.join('')))
}

async function submitDemo(): Promise<void> {
  await finishSignIn(await signInDemo())
}

async function finishSignIn(outcome: MerchantSignInOutcome): Promise<void> {
  if (outcome === 'signedIn') {
    // Loja aguardando aprovação ainda não lança visita: o Início explica o porquê.
    const fallback = session.value?.shopStatus === 'pending' ? MERCHANT_PANEL_PATH : MERCHANT_HOME_PATH
    await navigateTo(safeMerchantReturnPath(route.query.para, fallback), { replace: true })
    return
  }
  if (outcome === 'signUp') {
    await navigateTo(CLUB_SETUP_PATH, { replace: true })
    return
  }
  code.value = []
  await nextTick()
  const root: unknown = codeField.value?.$el
  if (root instanceof HTMLElement) root.querySelector('input')?.focus()
}

function backToPhone(): void {
  code.value = []
  changePhone()
}
</script>

<template>
  <div class="grid min-h-dvh lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
    <MerchantSignInAside :brand="t('app.name')" :title="t('merchantSignIn.asideTitle')" :steps="steps" />

    <div class="flex items-center justify-center px-4 py-8 sm:px-6 sm:py-10">
      <div class="flex w-full max-w-[420px] flex-col gap-6 sm:gap-8">
        <p class="letreiro w-fit rounded-lg border-[1.5px] border-cyan-400/90 px-2.5 py-1 text-sm font-extrabold tracking-wider text-cyan-400 lg:hidden">{{ t('app.name') }}</p>

        <form v-if="step.name === 'phone'" class="flex flex-col gap-6" novalidate @submit.prevent="requestCode(phoneDraft)">
          <PageTitle :title="t('merchantSignIn.title')" :lead="t('merchantSignIn.lead')">
            <p class="flex items-start gap-1.5 text-pretty text-toned">
              <UIcon name="i-ph-storefront" class="mt-1 size-4 shrink-0" aria-hidden="true" />{{ t('merchantSignIn.firstTime') }}
            </p>
          </PageTitle>

          <InkNote
            v-if="mockCode && mockPhone"
            tone="pencil"
            :description="t('merchantSignIn.mockHint', { phone: mockPhone, code: mockCode })"
          />

          <UFormField :label="t('merchantSignIn.phoneLabel')" :hint="t('merchantSignIn.phoneHint')" :error="phoneError" name="phone" size="xl">
            <template #error="{ error: message }">
              <span v-if="message" class="flex items-start gap-1.5"><UIcon name="i-ph-warning-circle" class="mt-0.5 size-4 shrink-0" aria-hidden="true" />{{ message }}</span>
            </template>
            <UInput
              :model-value="phoneDraft"
              type="tel"
              inputmode="tel"
              autocomplete="tel-national"
              :placeholder="t('merchantSignIn.phonePlaceholder')"
              size="xl"
              class="w-full"
              :ui="{ base: 'tabular text-xl font-semibold tracking-wide placeholder:font-normal' }"
              autofocus
              @update:model-value="onPhoneInput"
            />
          </UFormField>

          <div class="flex flex-col gap-2">
            <UButton type="submit" size="xl" block :loading="pending" :label="t('merchantSignIn.sendCode')" />
            <UButton v-if="demoEnabled" variant="ghost" color="neutral" block :disabled="pending" :label="t('merchantSignIn.demo')" @click="submitDemo" />
          </div>
        </form>

        <form v-else class="flex flex-col gap-6" novalidate @submit.prevent="submitCode">
          <PageTitle :title="t('merchantSignIn.codeTitle')">
            <p class="type-lead">
              <i18n-t keypath="merchantSignIn.codeLead" scope="global">
                <template #phone>
                  <span class="tabular font-semibold whitespace-nowrap text-highlighted">{{ sentTo }}</span>
                </template>
              </i18n-t>
              {{ ' ' }}
              <UButton variant="link" class="relative min-h-0 p-0 align-baseline text-base after:absolute after:-inset-x-1 after:-inset-y-2.5 after:content-['']" :label="t('merchantSignIn.changePhone')" @click="backToPhone" />
            </p>
          </PageTitle>

          <InkNote
            v-if="mockCode"
            tone="pencil"
            :description="t('signIn.mockHint', { code: mockCode })"
          />

          <UFormField ref="codeField" :label="t('merchantSignIn.codeLabel')" :error="codeError" name="code">
            <template #error="{ error: message }">
              <span v-if="message" class="flex items-start gap-1.5"><UIcon name="i-ph-warning-circle" class="mt-0.5 size-4 shrink-0" aria-hidden="true" />{{ message }}</span>
            </template>
            <UPinInput
              v-model="code"
              :length="LOGIN_CODE_LENGTH"
              type="number"
              otp
              size="xl"
              autofocus
              :disabled="pending"
              :highlight="codeError !== undefined"
              :color="codeError ? 'error' : 'primary'"
              :ui="{ root: 'w-full justify-between sm:justify-start gap-1.5 sm:gap-2', base: 'w-11 sm:w-12 min-h-12' }"
              @complete="submitCode"
            />
          </UFormField>

          <div class="flex flex-col gap-3">
            <UButton type="submit" size="xl" block :loading="pending" :label="t('merchantSignIn.submit')" />
            <UButton
              variant="ghost"
              color="neutral"
              block
              :disabled="resendIn > 0 || pending"
              :label="resendIn > 0 ? t('merchantSignIn.resendIn', { seconds: resendIn }) : t('merchantSignIn.resend')"
              @click="resendCode"
            />
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
