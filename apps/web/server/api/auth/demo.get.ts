import { getRequestHeader } from 'h3'
import { demoAvailability } from '../../utils/demoLogin'
import { readDemoConfig } from '../../utils/serverConfig'

/** Diz ao front se o botão "Entrar na demonstração" aparece. Só booleanos: número e código nunca saem do servidor. */
export default defineEventHandler((event) => {
  const { customerUrl, merchantUrl } = useRuntimeConfig().public
  const host = getRequestHeader(event, 'x-forwarded-host') ?? getRequestHeader(event, 'host')
  return demoAvailability(readDemoConfig(), host, { customerUrl, merchantUrl })
})
