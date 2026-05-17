# FitTrack Implementation Plan

## Phase 1: Database & API Foundation

**Focus**: Set up the database schema and all API endpoints that the frontend will consume.

### Tasks

- [x] Add `activityLevelEnum`, `preferredUnitsEnum`, `workoutTypeEnum`, `goalTypeEnum` enums to schema
- [x] Create `userProfile` table (height, weight, age, activity level, goals, units)
- [x] Create `workouts` table (type, name, duration, calories, distance, notes, date)
- [x] Create `dailyStats` table with unique constraint on (userId, date)
- [x] Create `goals` table (type, target, current, dates, completed)
- [x] Create `achievements` table (badge type, name, description, earnedAt)
- [x] Run `pnpm run db:push` to apply schema to database
- [x] Create `/api/fitness/profile/route.ts` — GET/POST profile
- [x] Create `/api/fitness/workouts/route.ts` — GET (paginated)/POST
- [x] Create `/api/fitness/workouts/[id]/route.ts` — GET/PUT/DELETE
- [x] Create `/api/fitness/daily-stats/route.ts` — GET historical
- [x] Create `/api/fitness/daily-stats/today/route.ts` — GET/POST upsert
- [x] Create `/api/fitness/goals/route.ts` — GET/POST
- [x] Create `/api/fitness/goals/[id]/route.ts` — PUT/DELETE
- [x] Create `/api/fitness/achievements/route.ts` — GET
- [x] Create `/api/fitness/summary/route.ts` — GET dashboard summary with streak, weekly workouts, recent workouts, active goals

### Technical Details

- All routes use `auth.api.getSession({ headers: await headers() })` for auth checks
- Return 401 if unauthenticated
- Use Drizzle ORM with `eq`, `and`, `desc`, `gte`, `lte` operators
- Dates stored as ISO date strings (`YYYY-MM-DD`)

### Acceptance Criteria

- [x] All tasks in this phase completed
- [x] Code passes lint and typecheck
- [x] Changes follow project conventions

---

## Phase 2: UI Components

**Focus**: Build all reusable fitness UI components used across pages.

### Tasks

- [x] Install shadcn components: `progress`, `select`, `tabs`, `table`, `form`
- [x] Install `recharts` package
- [x] Create `src/components/fitness/activity-ring.tsx` — SVG circular progress ring
- [x] Create `src/components/fitness/stat-card.tsx` — metric card with icon, value, trend
- [x] Create `src/components/fitness/workout-form.tsx` — form to log/edit workouts
- [x] Create `src/components/fitness/step-form.tsx` — form to log daily steps
- [x] Create `src/components/fitness/weekly-chart.tsx` — Recharts BarChart for 7-day steps
- [x] Create `src/components/fitness/calorie-chart.tsx` — Recharts LineChart for calories
- [x] Create `src/components/fitness/workout-card.tsx` — card displaying a workout entry
- [x] Create `src/components/fitness/goal-card.tsx` — card with progress bar for a goal

### Technical Details

- Activity rings use SVG `stroke-dasharray` / `stroke-dashoffset` for circular progress
- Charts use `ResponsiveContainer` from recharts for responsive sizing
- Forms use fetch to call API routes with toast feedback via Sonner
- Color tokens: blue (steps), orange (calories), green (active minutes), purple (workouts)

### Acceptance Criteria

- [x] All tasks in this phase completed
- [x] Code passes lint and typecheck
- [x] Changes follow project conventions

---

## Phase 3: Pages & Navigation

**Focus**: Build all app pages and update navigation/branding.

### Tasks

- [x] Replace `/dashboard` page with full fitness dashboard (activity rings, stat cards, weekly chart, recent workouts, active goals)
- [x] Create `/workouts` page — paginated list with type filter, log dialog, empty state
- [x] Create `/workouts/[id]` page — workout detail with edit/delete
- [x] Create `/steps` page — today's progress display, weekly chart, 30-day history table
- [x] Create `/goals` page — active/completed tabs, create goal dialog, delete
- [x] Create `/achievements` page — badge grid with 9 types, earned vs locked states
- [x] Update `src/components/site-header.tsx` — FitTrack brand, fitness nav links (Dashboard, Workouts, Steps, Goals, Achievements, AI Coach)
- [x] Update `src/app/page.tsx` — fitness-focused landing page with hero + feature cards
- [x] Update `/chat` page — rename to "AI Fitness Coach"
- [x] Update `/api/chat/route.ts` — add fitness-focused system prompt
- [x] Update root layout metadata to "FitTrack"
- [x] Run `pnpm run lint && pnpm run typecheck` — zero errors

### Technical Details

- Dashboard and pages are Client Components using `useSession()` for auth
- Navigation highlights active route using `usePathname()`
- Color scheme: blue-500 (steps/distance), orange-500 (calories), green-500 (active min), purple-500 (workouts), yellow-400 (achievements)
- All pages redirect to `/login` if unauthenticated

### Acceptance Criteria

- [x] All tasks in this phase completed
- [x] Code passes lint and typecheck
- [x] Changes follow project conventions
