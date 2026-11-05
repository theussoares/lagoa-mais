# Versões e releases

O Lagoa+ usa [SemVer](https://semver.org/lang/pt-BR/) (`vMAJOR.MINOR.PATCH`). A **tag na `main` é a fonte da versão**: uma só para o
produto inteiro (app do cliente, Balcão, API, painel da rede e LP saem juntos). Não há `version` nos `package.json`.

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
4. CI verde, merge na `main`.
5. Crie a tag anotada e o GitHub Release no commit do merge:

```bash
git fetch origin && git tag -a vX.Y.Z origin/main -m "vX.Y.Z: resumo"
git push origin vX.Y.Z
gh release create vX.Y.Z --verify-tag --title "vX.Y.Z" --generate-notes
```

Correção urgente na produção: branch a partir da `main`, PR para a `main`, tag PATCH, e traga a correção de volta para a `develop`.
