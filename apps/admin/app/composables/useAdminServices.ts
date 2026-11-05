import type { AdminServices } from '../services/AdminServices'

export function useAdminServices(): AdminServices {
  return useNuxtApp().$adminServices
}
