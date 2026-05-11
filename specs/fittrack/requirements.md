# FitTrack - Fitness Tracking Application

## Overview

FitTrack is a full-stack fitness tracking web application built on Next.js 16. It allows authenticated users to track their daily steps, workouts, calories burned, and progress toward fitness goals — with an AI-powered fitness coach built in.

## Target Users

Active individuals who want a simple, beautiful web app to log workouts, monitor daily activity, and stay motivated toward their fitness goals.

## Core Features

### 1. Activity Dashboard

- Daily summary showing steps, distance, calories burned, and active minutes
- Visual activity rings (SVG-based) for steps, calories, and active minutes vs goals
- Weekly step bar chart and calorie line chart (Recharts)
- Streak tracker for consecutive active days
- Recent workouts and active goals overview

### 2. Step & Distance Tracking

- Manual step and active-minute entry for each day
- Progress bar and large display showing today's steps vs daily goal
- 30-day history table with daily breakdown
- Weekly chart visualization

### 3. Workout Logger

- Log workouts by type: Running, Cycling, Strength, HIIT, Yoga, Swimming, Walking, Other
- Fields: name, date, duration (minutes), calories burned, distance (optional), notes
- Full CRUD: create, view, edit, delete workouts
- Filter by workout type, paginated list view
- Individual workout detail pages

### 4. Calorie Tracking

- Calories burned tracked per workout and per day
- Daily calorie totals surfaced on dashboard and steps page
- Weekly calorie chart visualization

### 5. Goals Management

- Goal types: Daily Steps, Weekly Workouts, Monthly Calories
- Progress tracking with percentage complete
- Active and completed goals tabs
- Create and delete goals

### 6. Achievements & Badges

- 9 badge types: First Workout, Week Warrior (7-day streak), 10K Steps, Half Marathon, Marathon, Century Club (100 workouts), Iron Week (7 workouts/week), Speed Demon, Early Bird
- Earned vs locked badge display
- Earned timestamp shown

### 7. AI Fitness Coach

- OpenRouter-powered AI chat interface
- System prompt tuned for fitness coaching: workout plans, nutrition advice, form tips, motivation
- Streaming responses via Vercel AI SDK

## Technical Requirements

### Stack

- **Framework**: Next.js 16 with App Router, React 19, TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Auth**: BetterAuth (email/password)
- **AI**: Vercel AI SDK + OpenRouter
- **UI**: shadcn/ui + Tailwind CSS 4 + Recharts
- **Dark Mode**: next-themes

### Database Schema

Five new tables added to the existing auth schema:

- `userProfile` — height, weight, age, activity level, step/calorie goals, preferred units
- `workouts` — type, name, duration, calories, distance, notes, date
- `dailyStats` — steps, distance, calories, active minutes (unique per user per day)
- `goals` — type, target, current value, dates, completed flag
- `achievements` — badge type, name, description, earned timestamp

### API Routes

RESTful API routes under `/api/fitness/`:

- `/profile` — GET/POST user fitness profile
- `/workouts` — GET (paginated)/POST workouts
- `/workouts/[id]` — GET/PUT/DELETE individual workout
- `/daily-stats` — GET historical stats
- `/daily-stats/today` — GET/POST today's stats (upsert)
- `/goals` — GET/POST goals
- `/goals/[id]` — PUT/DELETE individual goal
- `/achievements` — GET user achievements
- `/summary` — GET dashboard summary (today + streak + weekly workouts + recent workouts + active goals)

### Authentication

All fitness API routes require an authenticated session. Pages redirect to `/login` if unauthenticated.

## Non-Goals (v1)

- Mobile app / native step sync (manual entry only in v1)
- Social features / sharing
- Nutrition/food logging
- Wearable device integrations
- Payment/subscription tiers
