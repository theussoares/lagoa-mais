import type { AdminAuthService } from './AdminAuthService'
import type { AdminFeaturedService } from './AdminFeaturedService'
import type { AdminHitsService } from './AdminHitsService'
import type { AdminShopsService } from './AdminShopsService'
import type { AdminTeamService } from './AdminTeamService'

export interface AdminServices {
  readonly auth: AdminAuthService
  readonly shops: AdminShopsService
  readonly hits: AdminHitsService
  readonly featured: AdminFeaturedService
  readonly team: AdminTeamService
}
