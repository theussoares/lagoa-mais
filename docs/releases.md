# Versões e releases

O Lagoa+ usa [SemVer](https://semver.org/lang/pt-BR/) (`vMAJOR.MINOR.PATCH`). A **tag na `main` é a fonte da versão**: uma só para o
produto inteiro (app do cliente, Balcão, API, painel da rede e LP saem juntos). Não há `version` nos `package.json`.

## Onde a versão aparece

O arquivo `VERSION` na raiz (só `MAJOR.MINOR.PATCH`, sem `v`) é lido no build por `apps/web/server/utils/buildInfo.ts` e vira
`runtimeConfig.public.appVersion` no app/Balcão (`apps/web`) e na LP (`apps/site`); o painel da rede (`apps/admin`) deve ler
da mesma função. Na interface sai como `v0.2.2` (`useAppVersion` + `AppVersion`, em `layers/ui`): menu Mais do cliente, rodapé do menu
lateral e tela Configurações do lojista. Fora de produção (`VERCEL_ENV` diferente de `production`) vem junto o commit curto.
O arquivo existe porque a Vercel clona sem tags: `git describe` no build não é confiável.

Baseline: `v0.1.0` (estado da `main` em 05/11/2026, piloto em Três Lagoas/MS).

## Qual número subir

Enquanto estivermos em `0.x` (piloto):

| Mudança | Sobe |
| --- | --- |
| Funcionalidade nova (tela, regra, campo, migration aditiva) | MINOR (`0.2.0`) |
| Correção, ajuste de texto, desempenho, mudança interna | PATCH (`0.1.1`) |
| Quebra de contrato (API, dado, comportamento que o lojista já usa) | MINOR, com aviso no release |

A partir da `1.0.0`: quebra de contrato sobe o MAJOR. A `1.0.0` sai quando o piloto virar produto aberto.

## Como fazer um release

1. Todo trabalho entra na `develop` por PR (partindo da `develop`).
2. Abra o PR `develop` → `main` com título `release: vX.Y.Z (resumo)`. Corpo: o que entra, link dos PRs.
3. **Release com migration:** avise no corpo e aplique a migration na produção **antes** do merge, só pelo
   `pnpm --filter @lagoa/api db:migrate:prod` (ver `apps/api/README.md`). Nunca mergeie na `main` com migration pendente.
4. **No mesmo PR, atualize o arquivo `VERSION`** para `X.Y.Z` (sem o `v`). O CI falha (`server/test/versionSync.test.ts`) se o
   `VERSION` for menor que a última tag, se divergir do número do título `release: vX.Y.Z` ou, no push da tag, da própria tag.
   CI verde, merge na `main`.
5. Crie a tag (o mesmo número do `VERSION`; o CI roda de novo no push da tag e confere) anotada e o GitHub Release no commit do merge:

```bash
git fetch origin && git tag -a vX.Y.Z origin/main -m "vX.Y.Z: resumo"
git push origin vX.Y.Z
gh release create vX.Y.Z --verify-tag --title "vX.Y.Z" --generate-notes
```

Correção urgente na produção: branch a partir da `main`, PR para a `main`, tag PATCH, e traga a correção de volta para a `develop`.
