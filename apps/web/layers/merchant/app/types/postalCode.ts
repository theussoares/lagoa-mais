import type { Ref } from 'vue'

export type PostalCodeStatus = 'idle' | 'loading' | 'found' | 'notFound' | 'unavailable'

/** Campo CEP do Criar o clube: o que a tela mostra (com máscara) e a situação da busca. */
export interface PostalCodeField {
  readonly value: string
  readonly status: PostalCodeStatus
}

export interface PostalCodeLookupControl {
  value: Readonly<Ref<string>>
  status: Readonly<Ref<PostalCodeStatus>>
  change: (raw: string) => Promise<void>
}
