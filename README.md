# Family Budget

Family Budget is a shared household budgeting app for two or more family members.
It supports monthly planning, recurring items, approvals per member, equalization
between members, and reporting/statistics over time.

## What the app does

- Shared family budgets per month
- Income/expense items with tags
- Recurring templates copied into new months
- Member approval flow per month
- Equalization in two modes (`equal` and `proportional`)
- Monthly summary + historical statistics
- Invite flow for joining a family
- Reminder cron endpoint for unapproved upcoming budgets
- Swedish/English UI, plus theme/accent settings

## Tech stack

- SvelteKit + Svelte 5
- Tailwind CSS + shadcn-svelte UI components
- SQLite (`better-sqlite3`) + Drizzle ORM
- Paraglide i18n (inlang)
- Resend for invite/reminder email delivery

## Development setup

### 1) Install dependencies

```bash
npm install --legacy-peer-deps
```

### 2) Configure environment

```bash
cp .env.example .env
```

Update `.env` as needed:

- `DATABASE_URL` - SQLite file path (default `./data/budget.db`)
- `RESEND_API_KEY` - Resend API key
- `CRON_SECRET` - secret key for cron endpoint
- `BASE_URL` - app base URL
- `NODE_ENV` - `development` or `production`

### 3) Generate i18n runtime

```bash
npx @inlang/paraglide-js compile --project ./project.inlang --outdir ./src/lib/paraglide
```

### 4) Initialize database schema

```bash
npx drizzle-kit push
```

### 5) Run the app

```bash
npm run dev
```

## Useful development commands

```bash
npm run check
npm run build
npm run preview
npx drizzle-kit studio
```

## Deploy (Coolify, automated)

This repo is set up for automated deployment on Coolify via `docker-compose.yml`.

### What is automated

- App container build and startup
- SQLite persistence (`budget_data` volume mounted to `/app/data`)
- Drizzle migration on container start (`node migrate.mjs`)
- Reminder cron job in a sidecar service (`cron`)

### Coolify setup steps

1. Create a new **Docker Compose** resource in Coolify.
2. Point it to this repository and select `docker-compose.yml`.
3. Set environment variables in Coolify:
   - `BASE_URL=https://your-domain.com`
   - `CRON_SECRET=<strong-random-secret>`
   - `RESEND_API_KEY=<resend-api-key>`
4. Expose the `app` service on your domain (container port `3000`).
5. Deploy.

### Important notes

- Session cookies automatically use `secure: true` in production over HTTPS.
- The app expects a single writer for SQLite. Run one `app` replica.
- If `RESEND_API_KEY` is missing/placeholder in development, email sending is skipped.
- In production, missing/placeholder `RESEND_API_KEY` makes email sending fail loudly.

### Manual reminder endpoint test

```bash
curl "https://your-domain.com/api/cron/reminders?key=YOUR_CRON_SECRET"
```

For local development:

```bash
curl "http://localhost:5173/api/cron/reminders?key=your_cron_secret"
```
