import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolveBuildInfo } from '../../../../shared/version/appVersion'

const VERSION_FILE = fileURLToPath(new URL('../../../../VERSION', import.meta.url))

/** Lido na configuração do build (app, LP e painel da rede): uma versão só, a do arquivo `VERSION` da raiz. */
export function readBuildInfo(env: NodeJS.ProcessEnv = process.env): { version: string; commit: string } {
  return resolveBuildInfo({
    versionFile: readFileSync(VERSION_FILE, 'utf8'),
    commitSha: env.VERCEL_GIT_COMMIT_SHA ?? env.GITHUB_SHA,
    deployEnv: env.VERCEL_ENV,
  })
}
