/** Uma chamada fixa do BFF à API: o handler escolhe método e caminho; o navegador só fornece dados já validados. */
export interface AdminApiCall {
  readonly method: 'GET' | 'POST'
  readonly path: string
  readonly query?: Readonly<Record<string, string | number | undefined>>
  readonly body?: unknown
}

export interface AdminApiResponse {
  readonly status: number
  readonly headers: Headers
  readonly body: Buffer
}
