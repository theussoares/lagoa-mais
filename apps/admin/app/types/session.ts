import type { Ref } from 'vue'
import type { AdminSession } from '#shared/schemas/admin'

export interface AdminSessionControls {
  readonly state: Ref<AdminSession | undefined>
  refresh(): Promise<void>
  ensure(): Promise<void>
  signOut(): Promise<void>
}
