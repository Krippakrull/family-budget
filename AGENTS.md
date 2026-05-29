# AGENTS.md

## Tech stack

SvelteKit 2 + Svelte 5 (runes), Tailwind CSS v4, shadcn-svelte, SQLite (better-sqlite3) + Drizzle ORM, Paraglide i18n (inlang), Resend email, Chart.js.

## Setup order (must follow exactly)

```bash
npm install --legacy-peer-deps           # must use --legacy-peer-deps
cp .env.example .env                     # edit as needed
npx @inlang/paraglide-js compile \
  --project ./project.inlang \
  --outdir ./src/lib/paraglide           # MUST run before dev/build, output is gitignored
npx drizzle-kit push                     # create SQLite DB + schema
npm run dev                              # port 5173
```

## Dev commands

| Command | What it does |
|---------|-------------|
| `npm run dev` | Vite dev server (port 5173) |
| `npm run build` | Production build to `/build/` |
| `npm run check` | `svelte-kit sync && svelte-check` (type checking, no ESLint here) |
| `npm run start` | Start production build (`node build`) |
| `npm run preview` | Preview production build locally |

## Testing

Only 2 test files exist, using the **Node.js built-in test runner** (`node:test`), not Vitest or Jest:

```bash
node --test src/lib/server/currency.test.mjs src/lib/server/email-from.test.mjs
```

There is no npm script for tests, no CI, no pre-commit hooks.

## Linting & formatting

**None configured.** No ESLint, no Prettier. The only code quality check is `npm run check` (svelte-check types). Do not try to run `npm run lint` or `npx prettier --check`.

## Architecture notes

### Currency handling — CRITICAL

All monetary amounts are stored as **Swedish ören** (integers, SEK × 100). `src/lib/currency.js` provides:
- `parseCurrencyInput(rawInput, language)` → integer ören or null
- `formatCurrencyInputValue(oren, language)` → locale-aware string

Locale-aware: Swedish uses comma decimal separator (`,`) and dot grouping; English uses dot decimal and comma grouping.

### Auth & mutations

- Auth is **session-based** (HTTP-only cookie `session`, bcrypt cost 12, 30-day expiry).
- **All data mutations use SvelteKit form actions** (POST with `use:enhance`). Never create REST endpoints for CRUD.
- Only two API endpoints exist: `POST /api/theme` (persist theme live) and `GET /api/cron/reminders?key=SECRET`.

### i18n (Paraglide)

- Source language is **Swedish** (`messages/sv.json`), English in `messages/en.json`.
- The `src/lib/paraglide/` directory is **auto-generated and gitignored** — it must be compiled before dev/build (the Vite paraglide plugin handles this in dev, but the first compile must be done manually).
- Routes get `/[lang]/` prefix except the default language (sv).

### Database

- SQLite via `better-sqlite3`, Drizzle ORM.
- Schema at `src/lib/server/db/schema.ts`, migrations in `drizzle/`.
- `drizzle-kit push` for schema changes (Docker uses `migrate.mjs` which runs Drizzle migrations).
- **Single-writer constraint**: only one app replica in production because SQLite.
- DB file defaults to `./data/budget.db`, Docker mounts `budget_data` volume at `/app/data`.

### Budget flow (non-obvious)

- A month starts "uninitialized" — first visitor gets a setup choice: copy from existing month or start fresh (auto-copies recurring templates).
- `loadBudgetData` in `src/lib/server/budget.ts` is the entrypoint for all budget page loads.
- The `budget/[year]/[month]/+page.server.ts` has 11 form actions (addItem, updateItem, deleteItem, toggleApproval, etc.).
- `toggleApproval` has a side effect: when the last member approves and `sendApprovalSummary` is on, emails go to all members.

### Equalization

Two modes in `src/lib/equalization.ts`: `equal` (split remainders evenly) and `proportional` (income-ratio based). Transfer suggestions use a greedy max-debt→max-credit algorithm.

## Email

- Resend SDK. In **development**, missing/placeholder `RESEND_API_KEY` silently skips sending.
- In **production**, missing `RESEND_API_KEY` or `MAIL_FROM_DOMAIN` throws loudly.

## Docker deployment

Multi-stage Dockerfile, compose with `app` + `cron` sidecar. On container start: `node migrate.mjs && node build`. Cron hits `/api/cron/reminders?key=CRON_SECRET` daily at 9am.

## Env vars

Copy `.env.example` to `.env`. Required vars: `DATABASE_URL`, `RESEND_API_KEY`, `MAIL_FROM_DOMAIN`, `CRON_SECRET`, `BASE_URL`, `NODE_ENV`.
