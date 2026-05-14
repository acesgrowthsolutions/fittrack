/**
 * Canonical list of all badges the app awards. Single source of truth for
 * both the server-side qualifying logic (src/lib/achievements.ts) and the
 * client-side achievements page (src/app/achievements/page.tsx) — without
 * this split, the UI's hardcoded copy silently drifts from the server list
 * and new badges become invisible to users even though they're being
 * awarded.
 *
 * Pure data — no DB or React imports — so it can be imported anywhere.
 *
 * `hidden: true` marks "secret" badges. The UI renders them as a "???"
 * mystery tile until earned, and the achievements API strips their progress
 * info from the response so the criteria can't be discovered from
 * /api/fitness/achievements either. (Name/description still ship in the
 * client bundle — this is gameplay surprise, not security.)
 */
export const BADGE_DEFINITIONS = [
  {
    type: "first_workout",
    name: "First Workout",
    description: "Complete your first workout",
    hidden: false,
  },
  {
    type: "week_warrior",
    name: "Week Warrior",
    description: "Log activity for 7 consecutive days",
    hidden: false,
  },
  {
    type: "10k_steps",
    name: "10K Steps",
    description: "Reach 10,000 steps in a single day",
    hidden: false,
  },
  {
    type: "half_marathon",
    name: "Half Marathon",
    description: "Run a cumulative half marathon (21.1 km)",
    hidden: false,
  },
  {
    type: "marathon",
    name: "Marathon",
    description: "Run a cumulative marathon (42.2 km)",
    hidden: false,
  },
  {
    type: "century_club",
    name: "Century Club",
    description: "Complete 100 workouts",
    hidden: false,
  },
  {
    type: "iron_week",
    name: "Iron Week",
    description: "Complete 7 workouts in a single week",
    hidden: false,
  },
  {
    type: "speed_demon",
    name: "Speed Demon",
    description: "Complete a workout with a pace under 5 min/km",
    hidden: false,
  },
  {
    type: "early_bird",
    name: "Early Bird",
    description: "Log a workout before 7 AM",
    hidden: false,
  },
  {
    type: "getting_started",
    name: "Getting Started",
    description: "Complete 5 workouts",
    hidden: false,
  },
  {
    type: "half_century",
    name: "Half Century",
    description: "Complete 50 workouts",
    hidden: false,
  },
  {
    type: "five_k_club",
    name: "5K Club",
    description: "Run 5 km or more in a single workout",
    hidden: false,
  },
  {
    type: "ten_k_club",
    name: "10K Club",
    description: "Run 10 km or more in a single workout",
    hidden: false,
  },
  {
    type: "trailblazer",
    name: "Trailblazer",
    description: "Run a cumulative 100 km",
    hidden: false,
  },
  {
    type: "step_master",
    name: "Step Master",
    description: "Reach 20,000 steps in a single day",
    hidden: false,
  },
  {
    type: "long_session",
    name: "Long Session",
    description: "Complete a workout of 90 minutes or longer",
    hidden: false,
  },
  {
    type: "calorie_crusher",
    name: "Calorie Crusher",
    description: "Burn 1,000 calories in a single workout",
    hidden: false,
  },
  {
    type: "well_rounded",
    name: "Well-Rounded",
    description: "Complete 3 different workout types in a single calendar week",
    hidden: false,
  },
  {
    type: "two_week_wonder",
    name: "Two-Week Wonder",
    description: "Log workouts on 14 consecutive days",
    hidden: false,
  },
  {
    type: "night_owl",
    name: "Night Owl",
    description: "Log a workout between 10 PM and 4 AM",
    hidden: true,
  },
  {
    type: "weekend_warrior",
    name: "Weekend Warrior",
    description: "Work out on Sat and Sun for 4 weekends in a row",
    hidden: true,
  },
  {
    type: "comeback_kid",
    name: "Comeback Kid",
    description: "Return with a workout after a 30+ day break",
    hidden: true,
  },
  {
    type: "triathlete",
    name: "Triathlete",
    description: "Log running, cycling, and swimming all on the same day",
    hidden: true,
  },
] as const;

export type BadgeDefinition = (typeof BADGE_DEFINITIONS)[number];
export type BadgeType = BadgeDefinition["type"];
