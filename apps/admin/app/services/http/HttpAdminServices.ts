import { z } from 'zod'
import { allowing, type ApiClient } from '#layers/core/app/services/http/ApiClient'
import { AdminHitItemListSchema, AdminHitItemSchema, AdminShopDetailSchema, AdminShopListSchema, AdminUserSchema } from '#shared/schemas/admin'
import { AdminFeaturedListSchema, AdminPlacementSchema, FeaturedAvailabilitySchema, type FeaturedRangeQuery } from '#shared/schemas/featured'
import type { AdminFeaturedService } from '../AdminFeaturedService'
import type { AdminHitsService } from '../AdminHitsService'
import type { AdminShopsService } from '../AdminShopsService'
import type { AdminTeamService } from '../AdminTeamService'

/** Query string de um objeto já validado; campo ausente não vai. */
function search(query: Readonly<Record<string, string | undefined>>): string {
  const entries = Object.entries(query).flatMap(([key, value]) => (value === undefined ? [] : [[key, value]]))
  const text = new URLSearchParams(entries).toString()
  return text === '' ? '' : `?${text}`
}

const rangeSearch = (range: FeaturedRangeQuery): string => search({ surface: range.surface, from: range.from, to: range.to })

export function createHttpShopsService(api: ApiClient): AdminShopsService {
  return {
    list: async (query) => allowing('forbidden')(await api.get(`/shops${search(query)}`, AdminShopListSchema)),
    detail: async (id) => allowing('notFound', 'invalidTransition', 'forbidden')(await api.get(`/shops/${id}`, AdminShopDetailSchema)),
    act: async (id, action) => allowing('notFound', 'invalidTransition', 'forbidden')(await api.post(`/shops/${id}/actions`, AdminShopDetailSchema, { body: action })),
  }
}

export function createHttpHitsService(api: ApiClient): AdminHitsService {
  return {
    list: async (query) => allowing('forbidden')(await api.get(`/hits${search(query)}`, AdminHitItemListSchema)),
    review: async (id, review) =>
      allowing('notFound', 'conflict', 'invalidTransition', 'forbidden')(await api.post(`/hits/${id}/review`, AdminHitItemSchema, { body: review })),
  }
}

export function createHttpFeaturedService(api: ApiClient): AdminFeaturedService {
  return {
    list: async (range) => allowing('forbidden')(await api.get(`/featured${rangeSearch(range)}`, AdminFeaturedListSchema)),
    availability: async (range) => allowing('forbidden')(await api.get(`/featured/availability${rangeSearch(range)}`, FeaturedAvailabilitySchema)),
    create: async (draft) => allowing('slotsFull', 'invalidTarget', 'forbidden')(await api.post('/featured', AdminPlacementSchema, { body: draft })),
    cancel: async (id) => allowing('notFound', 'invalidTransition', 'forbidden')(await api.post(`/featured/${id}/cancel`, AdminPlacementSchema)),
  }
}

export function createHttpTeamService(api: ApiClient): AdminTeamService {
  return {
    list: async () => allowing('forbidden')(await api.get('/team', z.array(AdminUserSchema))),
    invite: async (invite) => allowing('alreadyExists', 'forbidden')(await api.post('/team/invite', AdminUserSchema, { body: invite })),
    act: async (id, action) => allowing('notFound', 'invalidTransition', 'forbidden')(await api.post(`/team/${id}/${action}`, AdminUserSchema)),
  }
}
