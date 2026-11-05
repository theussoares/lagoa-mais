import { describe, expect, it } from 'vitest'
import { compareVersions, formatVersionLabel, parseVersion, resolveBuildInfo, versionFromTag } from './appVersion'

describe('parseVersion', () => {
  it('accepts MAJOR.MINOR.PATCH only', () => {
    expect(parseVersion('0.2.2')).toEqual([0, 2, 2])
    expect(parseVersion(' 1.10.0\n')).toEqual([1, 10, 0])
    for (const bad of ['v0.2.2', '0.2', '0.2.2-rc.1', '', 'a.b.c']) expect(parseVersion(bad)).toBeNull()
  })
})

describe('compareVersions', () => {
  it('compares numerically, not as text', () => {
    expect(compareVersions('0.10.0', '0.9.9')).toBe(1)
    expect(compareVersions('0.2.2', '0.2.2')).toBe(0)
    expect(compareVersions('0.2.1', '0.2.2')).toBe(-1)
    expect(compareVersions('1.0.0', '0.99.99')).toBe(1)
  })

  it('refuses an invalid version', () => {
    expect(() => compareVersions('x', '0.1.0')).toThrow('invalid version')
  })
})

describe('versionFromTag / formatVersionLabel', () => {
  it('maps tag to version and version to the UI label', () => {
    expect(versionFromTag('v0.2.2')).toBe('0.2.2')
    expect(versionFromTag('0.2.2')).toBeNull()
    expect(versionFromTag('vnext')).toBeNull()
    expect(formatVersionLabel('0.2.2')).toBe('v0.2.2')
  })
})

describe('resolveBuildInfo', () => {
  const sha = 'D733754AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'

  it('hides the commit in production', () => {
    expect(resolveBuildInfo({ versionFile: '0.2.2\n', commitSha: sha, deployEnv: 'production' })).toEqual({ version: '0.2.2', commit: '' })
  })

  it('shows the short commit in preview and local builds', () => {
    expect(resolveBuildInfo({ versionFile: '0.2.2', commitSha: sha, deployEnv: 'preview' })).toEqual({ version: '0.2.2', commit: 'd733754' })
    expect(resolveBuildInfo({ versionFile: '0.2.2', commitSha: sha })).toEqual({ version: '0.2.2', commit: 'd733754' })
  })

  it('leaves the commit empty without a valid SHA', () => {
    expect(resolveBuildInfo({ versionFile: '0.2.2' }).commit).toBe('')
    expect(resolveBuildInfo({ versionFile: '0.2.2', commitSha: 'not-a-sha' }).commit).toBe('')
  })

  it('fails the build on a malformed VERSION', () => {
    expect(() => resolveBuildInfo({ versionFile: 'v0.2.2' })).toThrow('VERSION must be MAJOR.MINOR.PATCH')
  })
})
