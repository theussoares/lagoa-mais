import { describe, expect, it } from 'vitest'
import { buildWebManifest } from '../utils/webManifest'

const merchantUrl = 'https://balcao.lagoa.test'

describe('buildWebManifest', () => {
  it('starts the installed Balcão at /balcao, so it is not sent to the customer app', () => {
    const manifest = buildWebManifest({ merchantUrl, host: 'balcao.lagoa.test' })
    expect(manifest.start_url).toBe('/balcao')
    expect(manifest.id).toBe('/balcao')
  })

  it('starts the customer app at /carteira on any other host', () => {
    expect(buildWebManifest({ merchantUrl, host: 'app.lagoa.test' }).start_url).toBe('/carteira')
    expect(buildWebManifest({ merchantUrl, host: undefined }).start_url).toBe('/carteira')
  })

  it('stays the customer manifest when the surfaces are not split (no merchant URL)', () => {
    expect(buildWebManifest({ merchantUrl: '', host: 'localhost:3000' }).start_url).toBe('/carteira')
  })
})
