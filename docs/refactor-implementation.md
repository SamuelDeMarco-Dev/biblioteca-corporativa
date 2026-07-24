# Plano de Implementação da Refatoração — `biblioteca-interna`

> Companheiro **executável** do `docs/refactor-plan.md` (estratégia). Aqui cada fase
> vira tarefas em nível de arquivo, com estrutura-alvo, trechos de referência e um
> _Definition of Done_ verificável. Padrões: skills `sancon-express-arch` e
> `sancon-harness`. **Regra de ouro: um PR por sub-issue, sempre verde, sem regressão.**

## Como usar este documento

1. Abra a Epic + as 8 sub-issues no GitHub (ver `refactor-plan.md`).
2. Execute as fases **em ordem** (0 → 1 → 2 → 3 → 4). A Fase 3 pode paralelizar entre devs.
3. Para cada tarefa: crie a branch `<type>/N-slug`, implemente, rode a verificação local,
   abra o PR com `Closes #N`, espere os portões verdes + AI Review.
4. Marque o checkbox aqui ao concluir cada passo.

**Comando de verificação padrão (roda antes de todo PR):**

```bash
npm run format:check && npm run lint && npm run typecheck && npm run build && npm run test
```

---

## Estado atual (baseline de código)

```
src/
├── app.ts                 # rotas + 2 error handlers ad-hoc (jsonErrorHandler, erroGlobal)
├── server.ts
├── constants/permissoes.ts
├── controllers/           # 6 controllers (lógica de negócio vaza p/ cá)
├── routes/                # 6 route files por tipo
├── schemas/               # 4 schemas Zod (safeParse repetido nos controllers)
├── services/              # 6 services — importam `prisma` DIRETO (sem repository)
├── middlewares/auth.ts    # autenticar / exigirAdmin / exigirPermissao
├── lib/{prisma,mailer}.ts
├── utils/{erros,cpf}.ts   # asyncHandler existe mas NÃO é usado nas rotas
└── generated/prisma/**    # output do Prisma — NÃO editar
```

**Alvo (pós-refatoração):**

```
src/
├── app.ts                 # só monta middlewares + routes array do container
├── server.ts
├── container.ts           # ÚNICO ponto de instanciação/wiring
├── shared/
│   ├── errors/            # DomainError → NotFound/Forbidden/Conflict/Validation
│   ├── middlewares/       # errorHandler (RFC 9457), validate, auth
│   └── clients/           # openLibrary client (integração externa isolada)
├── modules/
│   ├── auth/       { schema, errors, repository, service, router, __tests__ }
│   ├── usuario/    { ... }
│   ├── livro/      { ... }
│   ├── locacao/    { ... }
│   ├── dashboard/  { ... }
│   └── permissao/  { ... }
└── generated/prisma/**
```

---

## FASE 0 — Arnês de qualidade (fundação) · `chore/N-arnes-qualidade`

Não toca em arquitetura. Sem isto nada é verificável pelos portões.

- [x] **0.1 — ESLint + Prettier.** Kit-base de backend TS (ver `sancon-harness` →
      `references/backend.md`). Ativar `@typescript-eslint/no-explicit-any: error`.
- [x] **0.2 — Scripts npm.** Adicionar ao `package.json`:
      `lint`, `lint:fix`, `format`, `format:check`, `typecheck` (`tsc --noEmit`).
- [x] **0.3 — `CLAUDE.md`.** Já criado na raiz (padrão harness). Revisar se comandos batem.
- [x] **0.4 — Test runner.** Migrar `jest` → **Vitest + Supertest** (só config: `vitest.config.ts`,
      `test` = `vitest run --coverage`, `test:watch`). Remover deps `jest`/`nodemon` órfãs.
- [x] **0.5 — Workflows `.github/`.** Copiar `ci.yml`, `quality-gate.yml`, `semgrep.yml`
      (+ job `trivy`), `ai-pr-review.yml`, `dependabot.yml`, `pull_request_template.md` do kit-base.
- [x] **0.6 — Baseline.** Gerar `quality/baseline.json` (`npm run quality:baseline`).
      Rodar Semgrep **sem `--error`** na 1ª rodada (calibração).

**DoD Fase 0:** `format:check`, `lint`, `typecheck`, `build`, `test` verdes localmente.
Zero mudança de comportamento. Workflows presentes e passando no PR.

> ⚠️ `lint` provavelmente **falha** ao ligar `no-explicit-any` (há `any` em `livro.service.ts`).
> Escolha: (a) `eslint-disable` temporário com TODO apontando p/ Fase 1, ou (b) puxar a
> correção do `any` para dentro da Fase 0. Recomendado (b) — é barato e deixa o lint honesto.

---

## FASE 1 — Quick wins · `fix/N-quality-quickwins`

Baixo risco, sem mudar arquitetura. Correções pontuais.

- [x] **1.1** `src/services/livro.service.ts:162` — `recalcularStatusLivro(client: any)`
      → `client: Prisma.TransactionClient` (importar de `../generated/prisma/client`).
- [x] **1.2** `src/services/livro.service.ts:123` — `d: any` no `.map()` do Open Library →
      tipar o `doc` (interface `OpenLibraryDoc` ou `unknown` + narrowing).
- [x] **1.3** `src/middlewares/auth.ts:44` — token inválido responde `400` → trocar para **`401`**
      (é falha de autenticação, não de payload).
- [x] **1.4** `src/services/livro.service.ts:92/106` — `listarLivros()` calcula
      `exemplaresDisponiveis` **duas vezes**; calcular uma vez e reutilizar.
- [x] **1.5** `src/services/locacao.service.ts:80` — remover a re-busca aninhada do `exemplar`;
      obter `livroId` diretamente do dado já carregado.

**DoD Fase 1:** zero `any` fora de `src/generated`; portões verdes; comportamento idêntico
**exceto** o status do token (agora `401`, correto). Cobrir o novo `401` com teste quando a Fase 3
tocar auth.

---

## FASE 2 — Infra de erros e contratos · `refactor/N-domain-errors`

Pré-requisito da migração. Cria a fundação; **ainda não religa** aos módulos.

- [x] **2.1 — Hierarquia de erros.** `src/shared/errors/`:
      `DomainError` (base, com `status` + `code`) → `NotFoundError` (404), `ForbiddenError` (403),
      `ConflictError` (409), `ValidationError` (400).
- [x] **2.2 — `errorHandler` central.** `src/shared/middlewares/error-handler.ts` formatando
      **Problem Details (RFC 9457)**. Deve tratar: `DomainError`, `ZodError`,
      `Prisma.PrismaClientKnownRequestError` (migra a lógica de `utils/erros.ts:tratarErroPrisma`:
      P2002→409, P2025→404), e fallback 500 genérico (sem vazar stack). Substitui
      `jsonErrorHandler` + `erroGlobal` de `app.ts` — mas só é plugado no fim da fase.
- [x] **2.3 — Middleware `validate`.** `src/shared/middlewares/validate.ts`:
      `validate(schema, source: 'body' | 'params' | 'query' = 'body')` — faz `safeParse`, em erro
      lança `ValidationError`, em sucesso injeta o parsed em `req`. Remove o `safeParse` repetido.
- [x] **2.4 — `asyncHandler` como padrão.** Mover `asyncHandler` de `utils/erros.ts` para
      `src/shared/middlewares/`; será o envelope obrigatório das rotas na Fase 3.
- [x] **2.5 — Religar `app.ts`.** Trocar os dois handlers ad-hoc pelo `errorHandler` central.
      (Contratos legados `{ erro, campos }` mudam para Problem Details **apenas** conforme cada
      módulo migra na Fase 3 — decidir se o front consome os dois formatos no período de transição.)

**DoD Fase 2:** infra criada e **coberta por teste unitário** (errorHandler mapeia cada erro no
status certo; validate rejeita/aceita). App continua subindo. Nenhum módulo migrado ainda.

> Decisão a registrar na Epic: durante a Fase 3 o app terá **dois formatos de erro** convivendo
> (Problem Details nos módulos migrados, `{ erro }` no legado). Alinhar com o front antes de começar.

---

## FASE 3 — Migração módulo a módulo (núcleo)

Um PR por módulo. Ordem por risco crescente. **Padrão idêntico para todos** (checklist abaixo).

### Checklist por módulo (aplicar a 3.1–3.5)

- [x] Criar `src/modules/<nome>/` com `<nome>.{schema,errors,repository,service,router}.ts`.
- [x] **Repository:** mover TODAS as queries Prisma pra cá; nomes de negócio
      (`findById`, `existsByEmail`, `softDelete`); **nunca** lança `DomainError`.
- [x] **Service:** recebe o repository **injetado** via construtor; contém a lógica de negócio;
      lança `DomainError` (fim das uniões `{ erro: '...' }`); zero import de Express/Prisma.
- [x] **Router:** factory fina — `validate` + `auth`/`requireRole` + `asyncHandler` + service.
      Handlers ≤ ~15 linhas, sem `try/catch`, sem acesso a repository.
- [x] **Schema:** tipos **inferidos** do Zod (`z.infer`), sem interface duplicada.
- [x] **Container:** registrar na ordem `repository → service → router → routes array`.
- [x] **Testes:** `service.test.ts` (mock do repo via `vi.fn()`) + `router.test.ts`
      (supertest + mock do service). Cada um cobre **feliz + erro/borda**.
- [x] **Remover** o controller/route/schema antigos correspondentes.
- [x] **DoD:** mesmo contrato externo do endpoint; cobertura do código novo; portões verdes.

### Ordem

- [x] **3.1 — auth** · `refactor/N-modulo-auth` — login/reset. Extrair o acesso a `prisma` do
      handler `me` para o repository. Menor superfície, primeiro.
- [x] **3.2 — usuario** · `refactor/N-modulo-usuario` — **+ mover a checagem de permissão** de
      `middlewares/auth.ts:exigirPermissao` (que hoje faz query no `prisma`) para service/repository;
      o middleware vira fino (só orquestra).
- [x] **3.3 — livro** · `refactor/N-modulo-livro` — maior service. **Isolar `buscarLivrosExternos`
      (Open Library)** num client em `src/shared/clients/open-library.ts` (com o `AbortController`/timeout).
      Migrar `excluirLivro` das uniões `{ erro: 'NAO_ENCONTRADO' | 'LOCADO' }` para `throw`.
- [x] **3.4 — locacao** · `refactor/N-modulo-locacao` — **risco alto** (transações + regra de admin).
      Mover `ehAdmin`/`todos` do controller → service; trocar uniões `{ erro }` por `throw DomainError`.
      Cuidado com o `$transaction` e o `recalcularStatusLivro` (compartilhado com livro → `shared/`).
- [x] **3.5 — dashboard + permissao** · `refactor/N-modulo-dashboard` — módulos menores, agrupados.

---

## FASE 4 — Limpeza final · `chore/N-cleanup`

- [x] **4.1** Apagar `src/controllers/`, `src/routes/`, `src/schemas/`, `src/utils/erros.ts`
      residuais e a pasta vazia `src/models/` (se existir).
- [x] **4.2** `app.ts` consome **só** o `routes array` do `container.ts` (nenhuma rota inline;
      mover `/health` para um módulo/router próprio ou mantê-lo explicitamente no `app.ts`).
- [x] **4.3** Confirmar catraca de cobertura e **atualizar o `baseline.json`** (só melhorando).
- [ ] **4.4** Ligar Semgrep com gate em ERROR (fim da calibração da Fase 0). **Pendente** — exige
      rodar o workflow no GitHub real para ver o volume de findings antes de gatear; não dá para
      calibrar localmente. Ver `.github/workflows/semgrep.yml`.

**DoD Fase 4:** nenhum arquivo legado de `controllers/routes/schemas`; grep por `import { prisma }`
só acha `container.ts` e repositories; portões verdes; baseline atualizado.

---

## Tabela de rastreamento

| Fase | Sub-issue                    | Branch                        | Status                                 |
| ---- | ---------------------------- | ----------------------------- | -------------------------------------- |
| 0    | Arnês de qualidade           | `chore/N-arnes-qualidade`     | ✅                                     |
| 1    | Quick wins                   | `fix/N-quality-quickwins`     | ✅                                     |
| 2    | Domain errors + contratos    | `refactor/N-domain-errors`    | ✅                                     |
| 3.1  | Módulo auth                  | `refactor/N-modulo-auth`      | ✅                                     |
| 3.2  | Módulo usuario               | `refactor/N-modulo-usuario`   | ✅                                     |
| 3.3  | Módulo livro                 | `refactor/N-modulo-livro`     | ✅                                     |
| 3.4  | Módulo locacao               | `refactor/N-modulo-locacao`   | ✅                                     |
| 3.5  | Módulo dashboard + permissao | `refactor/N-modulo-dashboard` | ✅                                     |
| 4    | Cleanup + consolidação       | `chore/N-cleanup`             | ⚠️ (falta calibrar Semgrep no CI real) |

## Riscos e mitigação

- **Dois formatos de erro convivendo na Fase 3** → alinhar com o front antes; documentar na Epic.
- **`recalcularStatusLivro` compartilhado entre livro e locacao** → extrair para `shared/` na 3.3,
  antes de migrar locacao (3.4).
- **Transações em locacao** → manter a mesma fronteira transacional; passar `Prisma.TransactionClient`
  entre repository/service pelo padrão do `sancon-express-arch`.
- **`no-explicit-any` quebrando o lint na Fase 0** → resolver o `any` junto (recomendado) ou disable temporário com TODO.
