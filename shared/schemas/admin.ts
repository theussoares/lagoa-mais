import { z } from 'zod'
import {
  ADMIN_MFA_CODE_LENGTH,
  ADMIN_NAME_MAX_LENGTH,
  ADMIN_PASSWORD_MAX_LENGTH,
  ADMIN_PASSWORD_MIN_LENGTH,
  ADMIN_SHOPS_SEARCH_MAX_LENGTH,
  ADMIN_NAME_MIN_LENGTH,
  ADMIN_REASON_MAX_LENGTH,
  EMAIL_MAX_LENGTH,
  HIT_ITEM_REJECTION_REASON_MAX_LENGTH,
} from '../constants/domain'
import { IsoDateTimeSchema } from './common'
import { PhoneNumberSchema } from './phone'
import { HitItemStatusSchema } from './hitItem'
import { ShopCategorySchema, ShopPlanSchema, ShopPublicContactSchema, ShopStatusSchema } from './shop'

const ReasonSchema = z.string().trim().min(1).max(ADMIN_REASON_MAX_LENGTH)

export const AdminUserSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  email: z.email().max(EMAIL_MAX_LENGTH),
  disabledAt: IsoDateTimeSchema.nullable(),
  createdAt: IsoDateTimeSchema,
})
export type AdminUser = z.infer<typeof AdminUserSchema>

export const AdminInviteSchema = z.strictObject({
  name: z.string().trim().min(ADMIN_NAME_MIN_LENGTH).max(ADMIN_NAME_MAX_LENGTH),
  email: z.string().trim().toLowerCase().pipe(z.email().max(EMAIL_MAX_LENGTH)),
})
export type AdminInvite = z.infer<typeof AdminInviteSchema>

/** O que fica em `admin_events.kind`: quem convidou, desativou, reativou ou zerou o MFA de quem. */
export const AdminEventKindSchema = z.enum(['invite', 'disable', 'reactivate', 'resetMfa'])
export type AdminEventKind = z.infer<typeof AdminEventKindSchema>

/** O BFF do admin reserva a tentativa de login antes de mandar a senha ao Supabase. Só o e-mail, normalizado. */
export const AdminLoginAttemptSchema = z.strictObject({
  email: z.string().trim().toLowerCase().pipe(z.email().max(EMAIL_MAX_LENGTH)),
})
export type AdminLoginAttempt = z.infer<typeof AdminLoginAttemptSchema>

const AdminEmailSchema = z.string().trim().toLowerCase().pipe(z.email().max(EMAIL_MAX_LENGTH))
/** Token do widget do Turnstile; o BFF confere no Cloudflare antes de qualquer outra coisa. */
const CaptchaTokenSchema = z.string().min(1).max(2048)

/** Entrar no painel (navegador → BFF do admin). A senha da tentativa não passa pelo teto: quem decide é o Supabase. */
export const AdminSignInSchema = z.strictObject({
  email: AdminEmailSchema,
  password: z.string().min(1).max(ADMIN_PASSWORD_MAX_LENGTH),
  captchaToken: CaptchaTokenSchema,
})
export type AdminSignIn = z.infer<typeof AdminSignInSchema>

export const AdminPasswordResetRequestSchema = z.strictObject({ email: AdminEmailSchema, captchaToken: CaptchaTokenSchema })
export type AdminPasswordResetRequest = z.infer<typeof AdminPasswordResetRequestSchema>

const MfaCodeSchema = z.string().regex(new RegExp(`^\\d{${ADMIN_MFA_CODE_LENGTH}}$`))

export const AdminMfaCodeSchema = z.strictObject({ code: MfaCodeSchema })
export type AdminMfaCode = z.infer<typeof AdminMfaCodeSchema>

export const AdminNewPasswordSchema = z.string().min(ADMIN_PASSWORD_MIN_LENGTH).max(ADMIN_PASSWORD_MAX_LENGTH)

/** Definir a senha pelo link do convite ou da recuperação: os tokens vêm do fragmento do link, nunca da URL do servidor. */
export const AdminSetPasswordSchema = z.strictObject({
  accessToken: z.string().min(1).max(4096),
  refreshToken: z.string().min(1).max(512),
  password: AdminNewPasswordSchema,
  /** Código do autenticador, quando a conta já tem um (link de recuperação). O BFF responde `mfaCodeRequired` se faltar. */
  code: MfaCodeSchema.optional(),
})
export type AdminSetPassword = z.infer<typeof AdminSetPasswordSchema>

/** Trocar a senha pede o código atual do autenticador: uma sessão roubada não troca a senha sozinha. */
export const AdminPasswordChangeSchema = z.strictObject({ password: AdminNewPasswordSchema, currentCode: MfaCodeSchema })
export type AdminPasswordChange = z.infer<typeof AdminPasswordChangeSchema>


/** Cadastrar autenticador: no primeiro acesso, nada; para trocar o que já existe, o código atual dele. */
export const AdminMfaEnrollRequestSchema = z.strictObject({ currentCode: MfaCodeSchema.optional() })
export type AdminMfaEnrollRequest = z.infer<typeof AdminMfaEnrollRequestSchema>

/** Depois da senha: cadastrar o autenticador (primeiro acesso) ou digitar o código. */
export const AdminMfaNextSchema = z.enum(['enroll', 'verify'])
export type AdminMfaNext = z.infer<typeof AdminMfaNextSchema>

/** O que o painel sabe da sessão: completa (com o nome), no meio do MFA, ou nenhuma (`null`). */
export const AdminSessionSchema = z
  .union([z.object({ admin: z.object({ name: z.string() }) }), z.object({ next: AdminMfaNextSchema })])
  .nullable()
export type AdminSession = z.infer<typeof AdminSessionSchema>

/** Cadastro do autenticador: o QR (SVG) e a chave para quem digita no app. */
export const AdminMfaEnrollmentSchema = z.object({ qrSvg: z.string(), secret: z.string() })
export type AdminMfaEnrollment = z.infer<typeof AdminMfaEnrollmentSchema>

/** Ação do admin sobre uma loja. Suspender exige o motivo. */
export const AdminShopActionSchema = z.discriminatedUnion('action', [
  z.strictObject({ action: z.literal('approve') }),
  z.strictObject({ action: z.literal('suspend'), reason: ReasonSchema }),
  z.strictObject({ action: z.literal('reactivate') }),
  z.strictObject({ action: z.literal('changePlan'), plan: ShopPlanSchema }),
])
export type AdminShopAction = z.infer<typeof AdminShopActionSchema>

/** Linha da lista de lojas da rede. Nunca leva contato do dono: isso só sai no detalhe. */
export const AdminShopRowSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  category: ShopCategorySchema,
  neighborhood: z.string(),
  status: ShopStatusSchema,
  plan: ShopPlanSchema,
  createdAt: IsoDateTimeSchema,
})
export type AdminShopRow = z.infer<typeof AdminShopRowSchema>

/** Cursor da lista: `<0 ou 1 (pendente primeiro)>:<id da última loja da página>`. */
export const AdminShopCursorSchema = z.string().regex(/^[01]:[0-9a-f-]{36}$/)

export const AdminShopListQuerySchema = z.strictObject({
  status: ShopStatusSchema.optional(),
  q: z.string().trim().min(1).max(ADMIN_SHOPS_SEARCH_MAX_LENGTH).optional(),
  cursor: AdminShopCursorSchema.optional(),
})
export type AdminShopListQuery = z.infer<typeof AdminShopListQuerySchema>

export const AdminShopListSchema = z.object({
  shops: z.array(AdminShopRowSchema),
  nextCursor: AdminShopCursorSchema.nullable(),
})
export type AdminShopList = z.infer<typeof AdminShopListSchema>

export const AdminShopStatusEventSchema = z.object({
  id: z.uuid(),
  fromStatus: ShopStatusSchema,
  toStatus: ShopStatusSchema,
  plan: ShopPlanSchema,
  /** Nome do admin do painel, ou o apelido do operador quando foi pelo script. */
  actorName: z.string(),
  reason: z.string().nullable(),
  createdAt: IsoDateTimeSchema,
})
export type AdminShopStatusEvent = z.infer<typeof AdminShopStatusEventSchema>

/** Detalhe da loja para a rede. O contato do dono (celular completo) só existe aqui; `null` se a conta do dono foi apagada. */
export const AdminShopDetailSchema = AdminShopRowSchema.extend({
  addressLine: z.string(),
  program: z.object({ rewardTitle: z.string(), mode: z.enum(['stamps', 'pointsPerCurrency', 'pointsPerVisit']), target: z.number().int() }).nullable(),
  owner: z.object({ phone: PhoneNumberSchema, email: z.email().nullable() }).nullable(),
  stats: z.object({ customers: z.number().int().min(0), visitsLast30Days: z.number().int().min(0) }),
  history: z.array(AdminShopStatusEventSchema),
})
export type AdminShopDetail = z.infer<typeof AdminShopDetailSchema>

/** Moderação de um produto do Hits. `expectedVersion` barra aprovar ou recusar o que o lojista editou depois de o admin abrir. */
export const HitItemReviewSchema = z.discriminatedUnion('action', [
  z.strictObject({ action: z.literal('approve'), expectedVersion: z.number().int().min(1) }),
  z.strictObject({
    action: z.literal('reject'),
    expectedVersion: z.number().int().min(1),
    reason: z.string().trim().min(1).max(HIT_ITEM_REJECTION_REASON_MAX_LENGTH),
  }),
  z.strictObject({
    action: z.literal('takeDown'),
    reason: z.string().trim().min(1).max(HIT_ITEM_REJECTION_REASON_MAX_LENGTH),
  }),
])
export type HitItemReview = z.infer<typeof HitItemReviewSchema>

/** Abas da fila de moderação: o que espera decisão e o que está na vitrine. */
export const AdminHitItemTabSchema = z.enum(['pending', 'approved'])
export type AdminHitItemTab = z.infer<typeof AdminHitItemTabSchema>

/** Cursor da fila: o id do último produto da página; a posição (data + id) é lida do banco. */
export const AdminHitItemListQuerySchema = z.strictObject({
  status: AdminHitItemTabSchema.default('pending'),
  cursor: z.uuid().optional(),
})
export type AdminHitItemListQuery = z.infer<typeof AdminHitItemListQuerySchema>

/**
 * Produto na fila do admin. `contact` é o botão que o cliente veria: o do produto, ou o da loja quando o produto não tem
 * (`contactSource`). Sem nenhum dos dois, `contact` é `null` e a origem fica `shop`.
 */
export const AdminHitItemSchema = z.object({
  id: z.uuid(),
  version: z.number().int().min(1),
  title: z.string(),
  description: z.string().nullable(),
  priceCents: z.number().int().nullable(),
  endsAt: IsoDateTimeSchema.nullable(),
  status: HitItemStatusSchema,
  rejectionReason: z.string().nullable(),
  photoUrl: z.url().nullable(),
  contact: ShopPublicContactSchema.nullable(),
  contactSource: z.enum(['item', 'shop']),
  shop: z.object({ id: z.uuid(), name: z.string(), status: ShopStatusSchema }),
  createdAt: IsoDateTimeSchema,
  approvedAt: IsoDateTimeSchema.nullable(),
})
export type AdminHitItem = z.infer<typeof AdminHitItemSchema>

export const AdminHitItemListSchema = z.object({
  items: z.array(AdminHitItemSchema),
  nextCursor: z.uuid().nullable(),
})
export type AdminHitItemList = z.infer<typeof AdminHitItemListSchema>
