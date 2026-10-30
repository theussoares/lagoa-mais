/** Códigos de erro do login do painel da rede (BFF do admin). Nenhum diz se o e-mail existe. */
export type AdminAuthErrorCode =
  | 'invalidCredentials'
  | 'captchaFailed'
  | 'invalidMfaCode'
  /** A conta tem autenticador: a ação só vale com o código dele (definir ou trocar a senha, trocar de autenticador). */
  | 'mfaCodeRequired'
  | 'weakPassword'
  | 'linkExpired'
  | 'rateLimited'
  | 'unauthorized'
  | 'forbidden'
  | 'network'
  | 'internal'
