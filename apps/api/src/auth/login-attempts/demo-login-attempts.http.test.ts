import { type INestApplication, Logger } from '@nestjs/common'
import { APP_FILTER } from '@nestjs/core'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { AllExceptionsFilter } from '../../common/http/all-exceptions.filter'
import { ENV } from '../../config/config.module'
import { DemoLoginAttemptsController } from './demo-login-attempts.controller'
import { type AttemptVerdict, LoginAttemptGate } from './login-attempt-gate'

const SECRET = 'bff-test-secret-bff-test-secret-0123'
const PATH = '/auth/demo-login-attempts'

class ScriptedGate {
  verdict: AttemptVerdict = 'allowed'
  readonly asked: string[] = []
  async reserveDemoLogin(ip: string): Promise<AttemptVerdict> {
    this.asked.push(ip)
    return this.verdict
  }
}

async function appWith(secret: string | undefined, gate: ScriptedGate): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    controllers: [DemoLoginAttemptsController],
    providers: [
      { provide: ENV, useValue: { BFF_SHARED_SECRET: secret } },
      { provide: LoginAttemptGate, useValue: gate },
      { provide: APP_FILTER, useClass: AllExceptionsFilter },
    ],
  }).compile()
  const app = moduleRef.createNestApplication()
  await app.init()
  return app
}

describe('POST /auth/demo-login-attempts', () => {
  let app: INestApplication
  const gate = new ScriptedGate()

  beforeAll(async () => {
    app = await appWith(SECRET, gate)
  })
  afterAll(() => app.close())
  beforeEach(() => {
    gate.verdict = 'allowed'
    gate.asked.length = 0
  })
  afterEach(() => vi.restoreAllMocks())

  const post = (headers: Record<string, string>) => request(app.getHttpServer()).post(PATH).set(headers)

  it('answers 204 under the cap and asks the gate about the caller', async () => {
    await post({ 'x-bff-secret': SECRET }).expect(204)
    expect(gate.asked).toHaveLength(1)
  })

  it('answers 429 rateLimited past the cap and 503 when the counter is down', async () => {
    vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined)
    gate.verdict = 'refused'
    await post({ 'x-bff-secret': SECRET }).expect(429, { code: 'rateLimited' })
    gate.verdict = 'unavailable'
    await post({ 'x-bff-secret': SECRET }).expect(503, { code: 'network' })
  })

  it.each([
    ['no secret', {}],
    ['a wrong secret', { 'x-bff-secret': 'not-the-bff-secret-not-the-bff-secret' }],
  ])('refuses %s with 401 without touching the counter', async (_name, headers) => {
    await post(headers).expect(401)
    expect(gate.asked).toEqual([])
  })
})

describe('POST /auth/demo-login-attempts without a configured secret', () => {
  it('refuses every caller', async () => {
    const gate = new ScriptedGate()
    const app = await appWith(undefined, gate)
    await request(app.getHttpServer()).post(PATH).set({ 'x-bff-secret': SECRET }).expect(401)
    expect(gate.asked).toEqual([])
    await app.close()
  })
})
