---
status: baseline
baselined_at: 2026-05-17
supersedes: v1/implementation-plan.md
---

# FitTrack — Current State (2026-05-17 baseline)

Snapshot of what's actually shipped on `main`. Replaces `v1/implementation-plan.md`, whose three phase issues (#2/#3/#4) and epic #1 are closed as completed. Anything not in this doc that you find in code is either (a) drift since the baseline date or (b) something nobody updated this file for — both fixable by editing this file.

## Stack

- **Framework:** Next.js 16 (App Router) · React 19 · TypeScript
- **Auth:** Better Auth (email/password + Google OAuth, with account linking and oAuthProxy for preview deploys)
- **DB:** PostgreSQL · Drizzle ORM · migrations in `drizzle/`
- **AI:** Vercel AI SDK 5 via OpenRouter (chat + meal photo analysis)
- **UI:** shadcn/ui + Tailwind 4 + next-themes dark mode + Recharts
- **Email:** Resend (password reset + email verification), console fallback when unset
- **Storage:** Local filesystem in dev, Vercel Blob in prod (auto-detected via `BLOB_READ_WRITE_TOKEN`)
- **Observability:** Sentry · `/api/diagnostics` endpoint for live health
- **Hosting:** Vercel, prod at `https://fitness-one-rust.vercel.app`

## Data model

Tables (`src/lib/schema.ts`):

- **Auth (BetterAuth):** `user`, `session`, `account`, `verification`
- **Fitness core:** `user_profile`, `workouts`, `daily_stats`, `goals`, `achievements`
- **Nutrition:** `meals` + `meal_type` enum
- **Health integrations:** `health_integration` + `health_integration_status` enum (Terra)
- **Infra:** `rate_limit_event`

Enums: `activity_level`, `preferred_units`, `workout_type`, `goal_type`, `meal_type`, `health_integration_status`.

## API surface (`src/app/api/`)

- **Auth:** `/auth/[...all]` (Better Auth catch-all)
- **Account:** `/account/delete`, `/account/export` (GDPR)
- **Fitness:** `/fitness/profile`, `/fitness/workouts` (+ `[id]`, `/totals`), `/fitness/daily-stats` (+ `/today`, `/today/add-steps`), `/fitness/goals` (+ `[id]`), `/fitness/achievements`, `/fitness/summary`, `/fitness/lifetime`
- **Meals:** `/meals` (+ `[id]`, `/analyze` for AI photo analysis)
- **Integrations:** `/integrations/terra` (+ `/connect`, `/webhook`)
- **AI chat:** `/chat`
- **Ops:** `/health` (liveness), `/diagnostics` (env/DB/auth/email/AI/storage status)

## Pages (`src/app/`)

- **Public/auth:** `/`, `/login`, `/register`, `/forgot-password`, `/reset-password`, `/privacy`, `/terms`
- **App (auth-gated):** `/dashboard`, `/workouts` (+ `/[id]`), `/steps`, `/goals`, `/meals`, `/achievements`, `/calculator`, `/chat`, `/profile`, `/account`

## Features beyond v1 scope

The v1 plan covered foundations (workouts, daily stats, goals, basic achievements, dashboard). Since then, the following has shipped:

- **Achievements engine** (`src/lib/badge-definitions.ts`): 23+ badges including hidden/masked variants, progress trackers for un-earned badges, toast-on-award, backfill on page visit, tz-aware date logic.
- **Terra health integration** (`src/app/api/integrations/terra/*`): step/activity sync from Apple Health, Google Fit, Fitbit, Garmin via webhooks → `daily_stats`.
- **Meals/nutrition logging:** AI-powered photo analysis using the vision model.
- **In-browser step tracker** with self-calibrating baseline for Android (`step-tracker.tsx`).
- **Workout timer, lifetime tracker, workout totals** components.
- **Google OAuth** with account linking (including different-email linking) and explicit account picker on every flow.
- **GDPR:** account export + deletion endpoints.
- **Rate limiting** infrastructure for paid AI calls (`rate_limit_event` table).
- **Security/CI:** CSP header, Dependabot, CI Postgres service, db-integrity tests, `format:check` gate.

## Known loose ends

- **Lint config broken** — `pnpm run lint` errors with "could not find plugin `react`" in the flat ESLint config. Typecheck still works.
- **Intermittent hydration error #418 on prod `/login`** — noted in agent memory, last unconfirmed on 2026-05-08. Watch Sentry.
- **Vercel CLI on local machine** is on 53.2.0 (latest 54.1.0). Cosmetic.
- **shadcn `form` component** was in the v1 plan but never installed. Forms work without it via plain React state — call this OBSOLETE unless standardising on react-hook-form.

## What's next

_(empty — define when scope is decided)_
