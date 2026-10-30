/** Códigos de erro do login do painel da rede (BFF do admin). Nenhum diz se o e-mail existe. */
export type AdminAuthErrorCode =
  | 'invalidCredentials'
  | 'captchaFailed'
  | 'invalidMfaCode'
  | 'weakPassword'
  | 'linkExpired'
  | 'rateLimited'
  | 'unauthorized'
  | 'forbidden'
  | 'network'
  | 'internal'
