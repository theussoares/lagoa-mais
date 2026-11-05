import { sql } from 'drizzle-orm'
import { appUsers } from '../database/schema'
import type { Tx } from '../database/database.module'

export interface NewAppUser {
  readonly userId: string
  readonly phoneEncrypted: Buffer
  readonly phoneHash: Buffer
  readonly emailEncrypted: Buffer | null
  readonly emailHash: Buffer | null
}

/**
 * Garante a linha de `app_users` de quem acabou de entrar pelo Supabase (o id é o `auth.users.id`). Cliente e lojista
 * dividem a conta: quem já existe é aproveitado, com o celular que ela guarda. Celular ou e-mail de outra conta viola
 * a constraint única, e quem chama traduz (`uniqueViolationConstraint`).
 */
export async function ensureAppUser(tx: Tx, user: NewAppUser): Promise<void> {
  // O ON CONFLICT (id) só arbitra o índice do id: dois pedidos do mesmo usuário (duas abas) que inserem ao mesmo tempo
  // estouram `app_users_phone_hash_unique` fora do árbitro, e o segundo recebia `phoneAlreadyUsed` contra si mesmo.
  // O lock por id serializa esses pedidos até o fim da transação; o segundo então enxerga a linha e o DO NOTHING vale.
  // Descartado: capturar o 23505 e reler por phone_hash (a transação já abortou; exigiria savepoint por chamada).
  // Outro usuário com o mesmo celular não é serializado aqui: continua batendo na constraint única, como deve.
  await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${user.userId}::text, 0))`)
  await tx
    .insert(appUsers)
    .values({
      id: user.userId,
      emailEncrypted: user.emailEncrypted,
      emailHash: user.emailHash,
      phoneEncrypted: user.phoneEncrypted,
      phoneHash: user.phoneHash,
    })
    .onConflictDoNothing({ target: appUsers.id })
}
