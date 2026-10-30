<script setup lang="ts">
import { MERCHANT_TERMS_VERSION } from '#shared/constants/domain'
import { formatDashboardDate, toMerchantHomeViewModel } from '../utils/homeModels'

definePageMeta({ path: '/painel', layout: 'merchant', middleware: 'merchant-auth' })

const { t } = useI18n()
const { session, expire } = useMerchantSession()
useHead({ title: () => `${t('home.title')} · ${t('app.name')}` })

const { state, refreshedAt, reload, posterReprint } = useMerchantHome()
const terms = useMerchantTerms(reload)
const termsError = computed(() => (terms.state.value.status === 'error' ? terms.state.value.code : null))
const campaignsEnabled = useCampaignsEnabled()

watch(state, (current) => {
  if (current.status === 'error' && current.error.code === 'unauthorized') void expire()
})

const dateText = computed(() => formatDashboardDate(refreshedAt.value))
const view = computed(() =>
  state.value.status === 'success'
    ? toMerchantHomeViewModel(state.value.value, refreshedAt.value, campaignsEnabled, t)
    : null,
)
</script>

<template>
  <div class="mx-auto flex max-w-[1360px] flex-col gap-6">
    <ClubSetupPoster v-if="posterReprint.poster" :poster="posterReprint.poster" class="hidden print:flex" />

    <div class="flex flex-col gap-6 print:hidden">
      <HomeDashboardHeader
        :shop-name="session?.shopName"
        :date-text="dateText"
        :loading="state.status === 'loading'"
        @refresh="reload"
      />

      <HomeTermsAcceptance
        v-if="terms.needed.value"
        :version="MERCHANT_TERMS_VERSION"
        :accepting="terms.state.value.status === 'accepting'"
        :error-code="termsError"
        @accept="terms.accept"
      />

      <HomePosterReprintNotice v-if="view?.posterReprintPending" @print="posterReprint.print" />

      <template v-if="view?.warnings.length">
        <InkNote
          v-for="warning in view.warnings"
          :key="warning"
          tone="warning"
          icon="i-ph-warning"
          :description="t(`home.warnings.${warning}`)"
          :actions="[{ label: t('common.retry'), onClick: reload }]"
        />
      </template>

      <HomeSkeleton v-if="state.status === 'loading'" />

      <InkNote
        v-else-if="state.status === 'error'"
        tone="error"
        icon="i-ph-warning-circle"
        :description="t(`errors.${state.error.code}`)"
        :actions="[{ label: t('common.retry'), onClick: reload }]"
        live
      />

      <div v-else-if="view" class="flex flex-col gap-4 sm:gap-6">
        <HomeIndicatorCards :cards="view.cards" />

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 items-start">
          <div class="flex flex-col gap-4 sm:gap-6 min-w-0">
            <HomeRecentActivity :rows="view.activityRows" />
            <HomeActiveCampaigns :items="view.activeCampaigns" :see-all-to="view.campaignsSeeAllTo" />
          </div>
          <div class="flex flex-col gap-4 sm:gap-6 min-w-0">
            <HomeComparisonChart :comparison="view.comparisonBars" />
            <HomeOpportunities :alerts="view.opportunities" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
