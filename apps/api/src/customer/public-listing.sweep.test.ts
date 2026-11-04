import { join } from 'node:path'
import { Controller, Get, Post } from '@nestjs/common'
import { describe, expect, it } from 'vitest'
import { controllerFiles, controllerRoutes, controllersInFiles } from '../test-support/controller-routes'
import { DIRECT_ACCESS_ROUTES, PUBLIC_LISTING_ROUTES, staleClassifiedRoutes, unclassifiedGetRoutes } from '../test-support/public-listing-routes'

// A loja demo some porque cada listagem pública passa por `listedShop()`. A ameaça é a próxima leitura pública que
// esquece o filtro. Varre `src` inteiro, não só `src/customer`: uma leitura `@Public()` num módulo novo (ex.: número
// público para a LP) é exatamente o esquecimento que esta varredura existe para pegar.
const SRC_ROOT = join(__dirname, '..')

@Controller('fixture/showcase')
class ForgottenListingFixtureController {
  @Get('shops')
  list(): void {}

  @Post('shops')
  create(): void {}
}

@Controller('merchant/fixture')
class PanelFixtureController {
  @Get()
  read(): void {}
}

describe('public listing sweep', () => {
  it('builds METHOD path for every handler', () => {
    expect(controllerRoutes([ForgottenListingFixtureController, PanelFixtureController])).toEqual(['GET fixture/showcase/shops', 'POST fixture/showcase/shops', 'GET merchant/fixture'])
  })

  it('flags an unclassified GET on a fixture, but not a write nor a panel route', () => {
    expect(unclassifiedGetRoutes(controllerRoutes([ForgottenListingFixtureController, PanelFixtureController]))).toEqual(['GET fixture/showcase/shops'])
  })

  it('never classifies a route in both lists', () => {
    const direct = new Set(Object.keys(DIRECT_ACCESS_ROUTES))
    expect(PUBLIC_LISTING_ROUTES.filter((route) => direct.has(route))).toEqual([])
  })

  it('every GET of src outside the admin and merchant panels is classified, and every classified route still exists', async () => {
    const routes = controllerRoutes(await controllersInFiles(controllerFiles(SRC_ROOT)))
    expect(routes.length).toBeGreaterThanOrEqual(40)
    expect(unclassifiedGetRoutes(routes)).toEqual([])
    expect(staleClassifiedRoutes(routes)).toEqual([])
  })
})
