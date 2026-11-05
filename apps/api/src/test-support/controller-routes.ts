import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import { RequestMethod, type Type } from '@nestjs/common'
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants'

// Mesma técnica dos helpers privados de `admin/access/admin-surface.sweep.test.ts`; não unificados nesta entrega para a
// trilha da loja demo não tocar `src/admin` (unificar depois é tarefa pequena).

const isClass = (value: unknown): value is Type<unknown> => typeof value === 'function'

export const isController = (value: unknown): value is Type<unknown> => isClass(value) && Reflect.getMetadata(PATH_METADATA, value) !== undefined

/** Todos os controllers de um módulo e dos que ele importa (estáticos ou `{ module }` dinâmicos). */
export function controllersOf(root: Type<unknown>, seen = new Set<unknown>()): Type<unknown>[] {
  if (seen.has(root)) return []
  seen.add(root)
  const own: unknown = Reflect.getMetadata('controllers', root)
  const imports: unknown = Reflect.getMetadata('imports', root)
  const children = (Array.isArray(imports) ? imports : []).flatMap((entry: unknown) => {
    const module = typeof entry === 'object' && entry !== null && 'module' in entry ? entry.module : entry
    return isClass(module) ? controllersOf(module, seen) : []
  })
  return [...(Array.isArray(own) ? own.filter(isController) : []), ...children]
}

/** Todo `*.controller.ts` debaixo de `dir`, em qualquer profundidade. */
export function controllerFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return controllerFiles(path)
    return entry.name.endsWith('.controller.ts') ? [path] : []
  })
}

export async function controllersInFiles(files: readonly string[]): Promise<Type<unknown>[]> {
  const modules = await Promise.all(files.map(async (file): Promise<Record<string, unknown>> => import(file)))
  return modules.flatMap((module) => Object.values(module).filter(isController))
}

const pathsOf = (metadata: unknown): string[] => {
  if (typeof metadata === 'string') return [metadata]
  if (Array.isArray(metadata)) return metadata.filter((path): path is string => typeof path === 'string')
  return ['']
}

const joinPath = (...parts: readonly string[]): string =>
  parts
    .flatMap((part) => part.split('/'))
    .filter((segment) => segment.length > 0)
    .join('/')

/** `METHOD caminho` de cada handler (sem barra inicial e sem o prefixo de versão), ex.: `GET discover/shops`. */
export function controllerRoutes(controllers: readonly Type<unknown>[]): string[] {
  return controllers.flatMap((controller) => {
    const bases = pathsOf(Reflect.getMetadata(PATH_METADATA, controller))
    const prototype: object = controller.prototype
    return Object.getOwnPropertyNames(prototype).flatMap((name) => {
      const handler: unknown = Reflect.get(prototype, name)
      if (typeof handler !== 'function' || name === 'constructor') return []
      const method: unknown = Reflect.getMetadata(METHOD_METADATA, handler)
      if (typeof method !== 'number') return []
      const verb = RequestMethod[method] ?? String(method)
      return bases.flatMap((base) => pathsOf(Reflect.getMetadata(PATH_METADATA, handler)).map((path) => `${verb} ${joinPath(base, path)}`))
    })
  })
}
