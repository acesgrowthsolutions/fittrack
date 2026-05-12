/**
 * Canonical list of all badges the app awards. Single source of truth for
 * both the server-side qualifying logic (src/lib/achievements.ts) and the
 * client-side achievements page (src/app/achievements/page.tsx) — without
 * this split, the UI's hardcoded copy silently drifts from the server list
 * and new badges become invisible to users even though they're being
 * awarded.
 *
 * Pure data — no DB or React imports — so it can be imported anywhere.
 */
export const BADGE_DEFINITIONS = [
  {
    type: "first_workout",
    name: "First Workout",
    description: "Complete your first workout",
  },
  {
    type: "week_warrior",
    name: "Week Warrior",
    description: "Log activity for 7 consecutive days",
  },
  {
    type: "10k_steps",
    name: "10K Steps",
    description: "Reach 10,000 steps in a single day",
  },
  {
    type: "half_marathon",
    name: "Half Marathon",
    description: "Run a cumulative half marathon (21.1 km)",
  },
  {
    type: "marathon",
    name: "Marathon",
    description: "Run a cumulative marathon (42.2 km)",
  },
  {
    type: "century_club",
    name: "Century Club",
    description: "Complete 100 workouts",
  },
  {
    type: "iron_week",
    name: "Iron Week",
    description: "Complete 7 workouts in a single week",
  },
  {
    type: "speed_demon",
    name: "Speed Demon",
    description: "Complete a workout with a pace under 5 min/km",
  },
  {
    type: "early_bird",
    name: "Early Bird",
    description: "Log a workout before 7 AM",
  },
  {
    type: "getting_started",
    name: "Getting Started",
    description: "Complete 5 workouts",
  },
  {
    type: "half_century",
    name: "Half Century",
    description: "Complete 50 workouts",
  },
  {
    type: "five_k_club",
    name: "5K Club",
    description: "Run 5 km or more in a single workout",
  },
  {
    type: "ten_k_club",
    name: "10K Club",
    description: "Run 10 km or more in a single workout",
  },
  {
    type: "trailblazer",
    name: "Trailblazer",
    description: "Run a cumulative 100 km",
  },
  {
    type: "step_master",
    name: "Step Master",
    description: "Reach 20,000 steps in a single day",
  },
  {
    type: "long_session",
    name: "Long Session",
    description: "Complete a workout of 90 minutes or longer",
  },
  {
    type: "calorie_crusher",
    name: "Calorie Crusher",
    description: "Burn 1,000 calories in a single workout",
  },
  {
    type: "well_rounded",
    name: "Well-Rounded",
    description: "Complete 3 different workout types in a single calendar week",
  },
  {
    type: "two_week_wonder",
    name: "Two-Week Wonder",
    description: "Log workouts on 14 consecutive days",
  },
] as const;

export type BadgeDefinition = (typeof BADGE_DEFINITIONS)[number];
export type BadgeType = BadgeDefinition["type"];
