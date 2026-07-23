# Plano de Refatoração — `biblioteca-interna`

> Alinhamento do projeto ao padrão Sancon (arquitetura Express modular + arnês de
> qualidade), sem regressão funcional. Base: skills `sancon-express-arch` e
> `sancon-harness`.

**Objetivo:** alinhar o projeto ao padrão Sancon sem regressão funcional.
**Estratégia:** *strangler* por módulo — infra e portões primeiro, depois migração
módulo a módulo, cada um num PR pequeno e verde. **A qualidade só sobe.**

Estrutura sugerida no GitHub: **1 Epic** + **8 sub-issues** linkadas.

---

## Diagnóstico inicial

Padrão atual: **MVC clássico** (`controllers/`, `services/`, `routes/` por tipo) —
não é a arquitetura Sancon Express (módulos `router → service → repository` com
`container.ts`). O arnês de qualidade está ausente (sem CI, lint/format, testes,
`CLAUDE.md`).

Pontos positivos: nenhum arquivo passa de 500 linhas (maior = 171),
`strict: true` no tsconfig, `.env` não versionado.

### Violações de invariante (arnês)

| # | Item | Onde | Regra |
|---|------|------|-------|
| 1 | `any` no TypeScript | `livro.service.ts:123` (`d: any`) e `:162` (`client: any`) | usar `unknown` / `Prisma.TransactionClient` |
| 2 | Sem ESLint/Prettier | raiz | toolchain obrigatória TS backend |
| 3 | Sem workflows de CI (`.github/`) | raiz | CI + Quality Gate + Semgrep + Trivy + AI Review |
| 4 | Zero testes | — | padrão Sancon: Vitest + Supertest |
| 5 | Sem `CLAUDE.md` | raiz | regras/Do-Not/verificação do repo |

### Desvios de arquitetura (`sancon-express-arch`)

1. Camada de repository inexistente — services importam `prisma` diretamente.
2. Sem `container.ts` / injeção de dependência.
3. Lógica de negócio vaza para o controller (ex.: `locacao.controller.ts:33-34`).
4. Erros ad-hoc em vez de `DomainError` + Problem Details (RFC 9457).
5. `asyncHandler` existe (`utils/erros.ts:43`) mas não é usado pelas rotas.

---

## FASE 0 — Arnês de qualidade (fundação)

Sem isto, nenhuma fase seguinte é verificável pelos portões. Não toca em arquitetura.

**Issue (Chore, G) — `chore: bootstrap do arnês de qualidade`** · branch `chore/N-arnes-qualidade`

| Passo | Entrega | Detalhe |
|---|---|---|
| 0.1 | ESLint + Prettier | toolchain TS backend; regra `no-explicit-any` ativa |
| 0.2 | Scripts npm | `lint`, `format:check`, `typecheck` (`tsc --noEmit`) |
| 0.3 | `CLAUDE.md` | ≤50 linhas, 5 seções, em inglês (template do harness) |
| 0.4 | Workflows `.github/` | `ci.yml`, `quality-gate.yml`, `semgrep.yml` + `trivy` |
| 0.5 | Baseline | `quality:baseline` gerado; Semgrep sem `--error` na 1ª rodada |
| 0.6 | Test runner | migrar `jest` → Vitest + Supertest (só config; testes vêm nas fases) |

**Aceite:** `lint`, `format:check`, `typecheck`, `build` verdes localmente. Nenhuma
mudança de comportamento.

---

## FASE 1 — Quick wins (baixo risco, alto valor)

**Issue (Fix, M) — `fix: corrigir any, status http e duplicações`** · branch `fix/N-quality-quickwins`

1. `livro.service.ts:162` — `recalcularStatusLivro(client: any)` → `client: Prisma.TransactionClient`.
2. `livro.service.ts:123` — `d: any` no `.map()` do Open Library → tipar o `doc` (interface / `unknown` + narrowing).
3. `auth.ts:44` — token inválido `400` → **`401`**.
4. `livro.service.ts:92/106` — calcular `exemplaresDisponiveis` uma vez.
5. `locacao.service.ts:80` — remover a re-busca aninhada do `exemplar`; obter `livroId` diretamente.

**Aceite:** zero `any` fora de `src/generated`; portões verdes; comportamento
idêntico exceto o código HTTP do token (agora `401`, correto).

---

## FASE 2 — Infra de erros e contratos (pré-requisito da migração)

**Issue (Refactor, M) — `refactor: erros de domínio e error handler central`** · branch `refactor/N-domain-errors`

- Criar `src/shared/errors/` com hierarquia `DomainError` → `NotFoundError`,
  `ForbiddenError`, `ConflictError`, `ValidationError`.
- `errorHandler` central formatando Problem Details (RFC 9457) — substitui o
  `erroGlobal`/`jsonErrorHandler` ad-hoc de `app.ts`.
- Middleware `validate(schema, 'body'|'params')` — remove o `safeParse` repetido
  de todo controller.
- Padronizar `asyncHandler` (já existe em `utils/erros.ts`) como envelope
  obrigatório das rotas.

**Aceite:** infra criada e coberta por teste unitário; ainda não religada aos
módulos (isso é por-módulo na Fase 3). App continua subindo.

---

## FASE 3 — Migração módulo a módulo (o núcleo)

Alvo por módulo: `src/modules/<nome>/` com
`schema · errors · repository · service · router · __tests__`, wired no
`container.ts`. Um PR por módulo.

Ordem por risco crescente (mais simples/isolado primeiro):

| Sub-issue | Módulo | Branch | Notas de migração |
|---|---|---|---|
| 3.1 | auth | `refactor/N-modulo-auth` | login/reset; extrai acesso a `prisma` do controller `me` para repository |
| 3.2 | usuario | `refactor/N-modulo-usuario` | + mover a checagem de permissão do `auth.ts` para service/repository |
| 3.3 | livro | `refactor/N-modulo-livro` | maior service; isolar `buscarLivrosExternos` (Open Library) num client em `shared/` |
| 3.4 | locacao | `refactor/N-modulo-locacao` | mover `ehAdmin`/`todos` do controller → service; trocar uniões `{ erro }` por `throw DomainError` |
| 3.5 | dashboard + permissao | `refactor/N-modulo-dashboard` | módulos menores, agrupados |

**Padrão de cada PR (idêntico):**

1. Criar pasta do módulo; mover queries Prisma para `*.repository.ts`.
2. Service passa a receber repository injetado; lança `DomainError` (fim das uniões de string).
3. Router = factory fina: `validate` + `auth`/`requireRole` + `asyncHandler` + service.
4. Registrar no `container.ts` (ordem: repository → service → router → routes array).
5. Testes: service (mock do repo) + router (supertest + mock do service), feliz **+ erro/borda**.
6. Remover o controller/route/schema antigos correspondentes.

**Aceite por módulo:** endpoints com mesmo contrato externo; cobertura do código
novo; portões verdes.

---

## FASE 4 — Limpeza final

**Issue (Chore, P) — `chore: remover MVC legado e consolidar`** · branch `chore/N-cleanup`

- Apagar `src/controllers/`, `src/routes/`, `src/schemas/`, `src/utils/erros.ts`
  residuais e a pasta vazia `src/models/`.
- `app.ts` passa a consumir só o `routes array` do `container.ts`.
- Confirmar catraca de cobertura e atualizar baseline.

---

## Observações de sequência

- Fases 0 → 1 → 2 são pré-requisito da 3; a 3 pode paralelizar entre devs (uma
  sub-issue cada), pois os módulos ficam independentes após a Fase 2.
- A Epic inteira (G) justifica PRD + TDD anexados à Epic (`sancon-issue` +
  `sancon-tdd`); cada sub-issue linka a Epic para a AI Review enxergar os requisitos.
- Risco maior concentrado em locacao (transações + regra de admin) e livro
  (integração externa) — deixados por último na Fase 3.
