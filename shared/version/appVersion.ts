const SEMVER = /^(\d+)\.(\d+)\.(\d+)$/
const COMMIT_SHA = /^[0-9a-f]{7,40}$/i
const SHORT_COMMIT_LENGTH = 7

/** Só `MAJOR.MINOR.PATCH`: sem prefixo `v`, sem pré-release (o produto não publica `-rc`). */
export function parseVersion(raw: string): readonly [number, number, number] | null {
  const match = SEMVER.exec(raw.trim())
  if (match === null) return null
  return [Number(match[1]), Number(match[2]), Number(match[3])]
}

export function compareVersions(a: string, b: string): number {
  const left = parseVersion(a)
  const right = parseVersion(b)
  if (left === null || right === null) throw new Error(`invalid version: ${left === null ? a : b}`)
  for (const index of [0, 1, 2] as const) {
    const difference = left[index] - right[index]
    if (difference !== 0) return Math.sign(difference)
  }
  return 0
}

/** `v0.2.2` -> `0.2.2`; qualquer outra coisa vira `null`. */
export function versionFromTag(tag: string): string | null {
  if (!tag.startsWith('v')) return null
  const version = tag.slice(1)
  return parseVersion(version) === null ? null : version
}

/** `0.2.2` -> `v0.2.2`, o formato mostrado na interface. */
export function formatVersionLabel(version: string): string {
  return `v${version}`
}

/**
 * A versão vem do arquivo `VERSION`. O commit curto só acompanha fora de produção (ajuda o suporte a achar o preview
 * certo sem poluir o que o cliente vê); sem SHA válido, fica vazio.
 */
export function resolveBuildInfo(input: { versionFile: string; commitSha?: string; deployEnv?: string }): { version: string; commit: string } {
  const version = input.versionFile.trim()
  if (parseVersion(version) === null) throw new Error(`VERSION must be MAJOR.MINOR.PATCH, got "${version}"`)
  const sha = input.commitSha?.trim() ?? ''
  const showCommit = input.deployEnv !== 'production' && COMMIT_SHA.test(sha)
  return { version, commit: showCommit ? sha.slice(0, SHORT_COMMIT_LENGTH).toLowerCase() : '' }
}
