# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Read the specs first

`docs/` is the source of truth for where this project is going, and **it describes an architecture the code does
not implement yet**. Reading the code alone will mislead you: the code has a single `Matrix` entity, while the
specs define `Renderer` / `Device` / `Scene`, a Go renderer, a binary device protocol and a firmware — none of
which exist.

Start with `docs/GLOSSARY.md` (short, and it prevents the main vocabulary confusion), then
`docs/ARCHITECTURE.md`. Decisions and their rejected alternatives live in `docs/adr/`.

The remaining work is tracked in GitHub issues, organised as 7 epics (#6–#12).

Specs are written in French; code, commits and issues are in English.

## Keep the specs and the issues current

The specs are deliberately **ahead** of the code. That only works if the gap closes over time instead of
widening, so treat documentation and issues as part of the change, not as follow-up work.

**When you change behaviour**, update the spec that describes it in the same change. If the code ends up
contradicting a spec, one of the two is wrong — decide which, and fix that one. Silently letting them diverge is
how the previous documentation ended up describing message formats that could not be implemented.

**When you make an architectural decision**, add an ADR in `docs/adr/` rather than burying the reasoning in a
commit message. Name the alternative you rejected and why. If the decision replaces an earlier one, mark the old
ADR `Remplacé par ADR-XXXX` instead of editing it — the point of the folder is that a decision can be reopened
by reading one file rather than redoing the analysis.

**When you finish a piece of work**, close its sub-issue and tick the matching checkbox in the parent epic.
Sub-issues carry `Depends on #N` lines and acceptance criteria; if the work turns out larger than the issue
describes, open a new issue rather than quietly widening the scope of the current one.

**The "Known hazards" section below is meant to shrink.** When you fix one of them, delete the entry and close
the issue it points at. An entry that stays after the problem is gone is worse than no entry.

## Commands

**There is no `package.json` at the repository root.** Everything lives under `webapp/`, a pnpm + Turbo
workspace. Run every command from `webapp/` — the only exception is `docker compose up -d`, which starts
PostgreSQL from the `compose.yml` at the root and is a prerequisite to everything below.

```bash
cd webapp
pnpm install
pnpm dev          # backend (3333) + frontend (3000)
pnpm build
pnpm lint
pnpm typecheck
pnpm test
pnpm format
```

Note that `lint`, `typecheck` and `test` only exercise the **backend** — the frontend package defines no such
scripts. A green `pnpm typecheck` says nothing about the Nuxt app, and neither does a green CI:
`.github/workflows/ci.yml` runs exactly these three commands on every pull request.

### Backend

From `webapp/apps/backend`, everything goes through `node ace`:

```bash
node ace serve --hmr
node ace migration:run
node ace generate:key

node ace test                              # both suites
node ace test unit                         # one suite: unit | functional
node ace test --files="matrix"             # files matching a pattern
node ace test --tests="creates a matrix"   # a single test by title
```

Suites are declared in `adonisrc.ts`: `unit` (`tests/unit/**`, 2s timeout) and `functional`
(`tests/functional/**`, 30s timeout).

Tests run against `matrixled_test`, configured by `.env.test` — deliberately self-contained so the suite needs
no local `.env`. `tests/bootstrap.ts` refuses to start against a database whose name does not end in `_test`,
migrates once in `runnerHooks.setup` and truncates before every test.

Node 24 (`.nvmrc`), pnpm 10.

`minimumReleaseAge` in `pnpm-workspace.yaml` holds installs back to versions published at least three days ago.
A brand-new release therefore resolves to the previous one rather than failing — if a version you expect does
not appear, check its publication date before assuming the lockfile is stale.

## Architecture

### Generated files you must not hand-edit

Two code-generation mechanisms are active, and both produce **committed** files. Editing them by hand is always
wrong.

- **`database/schema.ts`** is generated from the migrations (Lucid `schemaGeneration`, configured in
  `config/database.ts`). Models do not declare their own columns — they extend the generated classes:
  `Matrix extends MatrixSchema`, `User extends compose(UserSchema, withAuthFinder(hash))`. After changing a
  migration, re-run `node ace migration:run` to regenerate it. Custom rules go in `database/schema_rules.ts`.
- **`.adonisjs/`** holds the Tuyau client registry and server-side controller/route manifests, regenerated on
  build and dev.

### End-to-end type safety

The frontend imports the backend as a workspace dependency (`@matrixled-ssr/backend`) and builds its API client
from the generated registry in `app/plugins/api.ts`. Calls are made by **route name**, not URL:

```ts
const { $api } = useNuxtApp()
const [data, error] = await $api.request('matrices.index', {}).safe()
```

Route names come from the group/route `.as()` chain in `start/routes.ts`. Renaming a route silently breaks the
frontend at the type level, so run a backend build after touching route names.

Turbo's `dependsOn: ["^build"]` exists precisely because the frontend cannot typecheck before the backend has
generated its registry.

### API response shape

`providers/api_provider.ts` installs a custom serializer on `HttpContext` that wraps every response in a `data`
key. Controllers are expected to return `serialize(SomeTransformer.transform(model))`, never a raw model —
transformers in `app/transformers/` control which fields are exposed.

### Backend conventions

- Subpath imports throughout: `#controllers/*`, `#models/*`, `#services/*`, `#validators/*`, `#policies/*`,
  `#transformers/*` (mapped in `package.json`).
- Controllers stay thin: validate with a VineJS validator, authorise with a Bouncer policy, delegate to a
  service. `app/controllers/matrices_controller.ts` is the reference shape.
- Authorisation is owner-based via policies (`app/policies/matrix_policy.ts`).
- Primary keys are self-assigned UUIDs, generated in a `@beforeCreate` hook — `static selfAssignPrimaryKey = true`.
- The API is JSON-only: `force_json_response_middleware` is registered globally.

### Frontend

- **Nuxt runs as an SPA** (`ssr: false` in `nuxt.config.ts`), despite the project being named "SSR" — that name
  refers to server-side rendering of LED **frames**, not HTML.
- shadcn-nuxt components are auto-imported with a `Ui` prefix (`UiButton`, `UiTable`).
- In dev, `/api` is proxied to `http://localhost:3333/api` by Nitro; there is no CORS setup in dev.
- All user-facing strings go through i18n (`i18n/locales/{en,fr}.json`).
- Cross-component refresh uses Nuxt hooks (`app:matrix:created`, `:updated`, `:deleted`) rather than a store.

## Known hazards

- **Devices cannot authenticate.** The token guard was deliberately removed in `59e299f`, leaving only the
  session guard. Anything requiring non-browser authentication needs it reintroduced first (issue #21).
- `Matrix.config` is `vine.record(vine.any())` typed `any` — validated by nothing today.

## Commits

Conventional commits, scoped by package: `feat(webapp.backend):`, `chore(webapp.frontend):`, `docs:`.
Git identity is configured at repository level only.
