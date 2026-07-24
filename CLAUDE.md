# CLAUDE.md

Node + TypeScript + Express + Prisma (PostgreSQL) — internal library management API for Sancon Hub.

## Essential Rules

1. Don't assume. Surface tradeoffs; don't hide confusion.
2. Write the minimum code that solves the problem. No speculative features.
3. Touch only what you must. Never alter unrelated code.
4. Define the success criteria and loop until verified.

## Constraints (Do Not)

- Never use `any` in TypeScript — use `unknown` and narrow (e.g. `Prisma.TransactionClient`). ESLint blocks it.
- Don't add new dependencies without explicit approval.
- No secrets, API keys, or PII in Git. Never commit `.env` with a real `DATABASE_URL` or `JWT_SECRET`.
- Don't edit an already-applied migration — generate a new Prisma migration instead.
- Don't put business logic in routers/controllers or import `prisma` outside the repository layer (target: `router → service → repository`).
- Don't hand-edit `src/generated/prisma/**` — it is Prisma output; regenerate with `prisma generate`.

## Verification

- Typecheck: `npm run typecheck` (`tsc --noEmit`) — Build: `npm run build`.
- Lint: `npm run lint` — Format: `npm run format` (check: `npm run format:check`).
- Database/schema: `npx prisma validate` before a PR.
- Test: `npm run test` (Vitest + Supertest, `--coverage`).
- Verified = lint + format:check + typecheck + build + test all green before a PR. If a step fails, read the full error output before attempting a fix.

## References

- Setup and environment: `README.md`
- Refactoring roadmap: `docs/refactor-plan.md` (strategy) + `docs/refactor-implementation.md` (execution)
- Target architecture (`router → service → repository`, `container.ts`): skill `sancon-express-arch`
- CI/CD, repo security, quality gates: skill `sancon-harness`
- Requirements & API contracts: GitHub issue (`repo#N`) + PRD/TDD attached to the issue when available
