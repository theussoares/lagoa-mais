import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { compareVersions, parseVersion, versionFromTag } from '../../../../shared/version/appVersion'
import { readBuildInfo } from '../utils/buildInfo'

const ROOT = fileURLToPath(new URL('../../../../', import.meta.url))
const version = readFileSync(`${ROOT}VERSION`, 'utf8').trim()

function releaseTags(): string[] {
  try {
    return execFileSync('git', ['tag', '--list', 'v*'], { cwd: ROOT, encoding: 'utf8' })
      .split('\n')
      .map((tag) => versionFromTag(tag.trim()))
      .filter((tag): tag is string => tag !== null)
  } catch {
    return []
  }
}

/** Guarda do fluxo de release (docs/releases.md): o arquivo `VERSION` nunca diverge da tag na `main`. */
describe('VERSION file', () => {
  it('is a valid SemVer and feeds the build info', () => {
    expect(parseVersion(version)).not.toBeNull()
    expect(readBuildInfo({}).version).toBe(version)
  })

  it('is not behind the latest release tag', () => {
    const latest = releaseTags().sort(compareVersions).at(-1)
    if (latest === undefined) return
    expect(compareVersions(version, latest)).toBeGreaterThanOrEqual(0)
  })

  it('equals the tag when CI runs for a release tag', () => {
    const tag = process.env.GITHUB_REF_TYPE === 'tag' ? versionFromTag(process.env.GITHUB_REF_NAME ?? '') : null
    if (tag === null) return
    expect(version).toBe(tag)
  })

  it('equals the number in the title of a release PR into main', () => {
    const title = process.env.RELEASE_PR_TITLE ?? ''
    const match = /^release: v(\d+\.\d+\.\d+)\b/.exec(title)
    if (match === null) return
    expect(version).toBe(match[1])
  })
})
