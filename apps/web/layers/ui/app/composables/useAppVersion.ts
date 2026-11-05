import { formatVersionLabel } from '#shared/version/appVersion'

/** Versão do produto injetada no build (`runtimeConfig.public`), igual nas três superfícies. */
export function useAppVersion(): { version: string; label: string; commit: string } {
  const { appVersion, appCommit } = useRuntimeConfig().public
  const version = String(appVersion)
  return { version, label: formatVersionLabel(version), commit: String(appCommit) }
}
