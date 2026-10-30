import { PhoneNumberSchema } from '#shared/schemas/phone'
import type { AdminHitItem, AdminShopDetail, AdminShopRow } from '#shared/schemas/admin'

export const SHOP_ID = '0190a000-0000-7000-8000-0000000005a1'

export function hitItem(patch: Partial<AdminHitItem> = {}): AdminHitItem {
  return {
    id: '0190a000-0000-7000-8000-0000000001a1',
    version: 1,
    title: 'Pão de queijo',
    description: null,
    priceCents: 1250,
    endsAt: null,
    status: 'pending',
    rejectionReason: null,
    photoUrl: 'https://project.supabase.co/storage/v1/object/public/shop-assets/a.webp',
    contact: { kind: 'url', url: 'https://padaria.test/pedido', ctaLabel: 'Pedir' },
    contactSource: 'item',
    shop: { id: SHOP_ID, name: 'Padaria Lagoa', status: 'approved' },
    createdAt: '2026-10-20T12:00:00.000Z',
    approvedAt: null,
    ...patch,
  }
}

export function shopRow(patch: Partial<AdminShopRow> = {}): AdminShopRow {
  return {
    id: SHOP_ID,
    name: 'Padaria Lagoa',
    category: 'bakery',
    neighborhood: 'Centro',
    status: 'pending',
    plan: 'founder',
    createdAt: '2026-10-20T12:00:00.000Z',
    ...patch,
  }
}

export function shopDetail(patch: Partial<AdminShopDetail> = {}): AdminShopDetail {
  return {
    ...shopRow(),
    addressLine: 'Rua A, 10',
    program: null,
    owner: { phone: PhoneNumberSchema.parse('67991234567'), email: null },
    stats: { customers: 3, visitsLast30Days: 9 },
    history: [],
    ...patch,
  }
}
