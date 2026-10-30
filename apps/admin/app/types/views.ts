import type { Ref } from 'vue'
import type { AdminMfaEnrollment } from '#shared/schemas/admin'
import type { AdminAuthErrorCode } from '#shared/types/adminAuth'
import type { ScreenMessage } from './admin'
import type { ShopPublicContact, ShopStatus } from '#shared/schemas/shop'

export interface HitCard {
  readonly id: string
  readonly title: string
  readonly description: string | null
  readonly photoUrl: string | null
  readonly priceLabel: string | null
  readonly endsLabel: string | null
  readonly shopName: string
  readonly shopStatus: ShopStatus
  readonly contactHref: string | null
  readonly contactLabel: string | null
  readonly contactKind: ShopPublicContact['kind'] | null
  readonly contactSource: 'item' | 'shop'
  readonly createdLabel: string
}

/** Link do convite ou da recuperação de senha, lido do fragmento (`#access_token=…&type=invite`). */
export type LinkFragment =
  | { readonly status: 'ok'; readonly accessToken: string; readonly refreshToken: string; readonly kind: 'invite' | 'recovery' }
  | { readonly status: 'invalid' }

export interface TurnstileControls {
  readonly token: Ref<string>
  readonly enabled: boolean
  reset(): void
}

export interface SignInForm {
  email: string
  password: string
}

export interface SignInScreen {
  form: SignInForm
  captchaToken: string
  captchaResetKey: number
  submitting: boolean
  errorCode: AdminAuthErrorCode | null
  change(patch: Partial<SignInForm>): void
  setCaptcha(token: string): void
  submit(): Promise<void>
}

export interface MfaScreen {
  step: 'enroll' | 'verify'
  enrollment: AdminMfaEnrollment | null
  code: string
  submitting: boolean
  loading: boolean
  errorCode: AdminAuthErrorCode | null
  setCode(code: string): void
  submit(): Promise<void>
  signOut(): Promise<void>
}

export interface ForgotPasswordScreen {
  email: string
  captchaToken: string
  captchaResetKey: number
  submitting: boolean
  sent: boolean
  errorCode: AdminAuthErrorCode | null
  setEmail(email: string): void
  setCaptcha(token: string): void
  submit(): Promise<void>
}

export interface PasswordForm {
  password: string
  confirmation: string
}

export interface SetPasswordScreen {
  link: LinkFragment | null
  form: PasswordForm
  submitting: boolean
  done: boolean
  needsCode: boolean
  code: string
  errorCode: AdminAuthErrorCode | 'passwordMismatch' | 'passwordTooShort' | null
  change(patch: Partial<PasswordForm>): void
  setCode(code: string): void
  submit(): Promise<void>
}

export interface AccountScreen {
  name: string
  password: PasswordForm
  /** Códigos do autenticador atual: trocar a senha e trocar de autenticador só com ele. */
  passwordCode: string
  currentCode: string
  passwordSaving: boolean
  passwordMessage: ScreenMessage | null
  enrollment: AdminMfaEnrollment | null
  mfaCode: string
  mfaBusy: boolean
  mfaMessage: ScreenMessage | null
  setPasswordCode(code: string): void
  setCurrentCode(code: string): void
  changePassword(patch: Partial<PasswordForm>): void
  savePassword(): Promise<void>
  startMfa(): Promise<void>
  setMfaCode(code: string): void
  confirmMfa(): Promise<void>
  cancelMfa(): void
}
