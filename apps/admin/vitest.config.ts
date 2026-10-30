import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const fromRoot = (path: string): string => fileURLToPath(new URL(path, import.meta.url))

// Só peças puras (BFF e composables de tela com o service injetado): sem ambiente Nuxt.
export default defineConfig({
  resolve: { alias: { '#shared': fromRoot('../../shared'), '#layers/ui': fromRoot('../web/layers/ui'), '#layers/core': fromRoot('../web/layers/core') } },
  test: {
    environment: 'node',
    include: ['server/test/**/*.test.ts', 'app/**/*.test.ts'],
  },
})
