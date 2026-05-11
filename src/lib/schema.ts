import {
  pgTable,
  text,
  timestamp,
  boolean,
  index,
  integer,
  numeric,
  date,
  pgEnum,
  uniqueIndex,
  uuid,
  jsonb,
} from "drizzle-orm/pg-core";

// IMPORTANT! ID fields should ALWAYS use UUID types, EXCEPT the BetterAuth tables.

export const user = pgTable(
  "user",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: boolean("email_verified").default(false).notNull(),
    image: text("image"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("user_email_idx").on(table.email)]
);

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("session_user_id_idx").on(table.userId),
    index("session_token_idx").on(table.token),
  ]
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("account_user_id_idx").on(table.userId),
    index("account_provider_account_idx").on(table.providerId, table.accountId),
  ]
);

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

// ── Fitness Tracking Tables ──────────────────────────────────────────────────

export const activityLevelEnum = pgEnum("activity_level", [
  "sedentary",
  "light",
  "moderate",
  "active",
  "very_active",
]);

export const preferredUnitsEnum = pgEnum("preferred_units", ["metric", "imperial"]);

export const workoutTypeEnum = pgEnum("workout_type", [
  "running",
  "cycling",
  "strength",
  "hiit",
  "yoga",
  "swimming",
  "walking",
  "other",
]);

export const goalTypeEnum = pgEnum("goal_type", [
  "daily_steps",
  "weekly_workouts",
  "monthly_calories",
  "weight_target",
]);

export const mealTypeEnum = pgEnum("meal_type", ["breakfast", "lunch", "dinner", "snack"]);

export const userProfile = pgTable(
  "user_profile",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .unique()
      .references(() => user.id, { onDelete: "cascade" }),
    height: numeric("height"),
    weight: numeric("weight"),
    age: integer("age"),
    activityLevel: activityLevelEnum("activity_level").default("moderate"),
    dailyStepGoal: integer("daily_step_goal").default(10000),
    dailyCalorieGoal: integer("daily_calorie_goal").default(2000),
    preferredUnits: preferredUnitsEnum("preferred_units").default("metric"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("user_profile_user_id_idx").on(table.userId)]
);

export const workouts = pgTable(
  "workouts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    type: workoutTypeEnum("type").notNull(),
    name: text("name").notNull(),
    durationMinutes: integer("duration_minutes").notNull(),
    caloriesBurned: integer("calories_burned").notNull(),
    distanceKm: numeric("distance_km"),
    notes: text("notes"),
    workoutDate: date("workout_date").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("workouts_user_id_idx").on(table.userId),
    index("workouts_date_idx").on(table.workoutDate),
  ]
);

export const dailyStats = pgTable(
  "daily_stats",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    steps: integer("steps").default(0).notNull(),
    distanceKm: numeric("distance_km").default("0").notNull(),
    caloriesBurned: integer("calories_burned").default(0).notNull(),
    activeMinutes: integer("active_minutes").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("daily_stats_user_date_idx").on(table.userId, table.date),
    index("daily_stats_date_idx").on(table.date),
  ]
);

export const goals = pgTable(
  "goals",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    type: goalTypeEnum("type").notNull(),
    targetValue: numeric("target_value").notNull(),
    currentValue: numeric("current_value").default("0").notNull(),
    unit: text("unit").notNull(),
    startDate: date("start_date").notNull(),
    endDate: date("end_date"),
    completed: boolean("completed").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("goals_user_id_idx").on(table.userId)]
);

export interface MealFoodItem {
  name: string;
  portion: string;
  calories: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
}

export const meals = pgTable(
  "meals",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    mealType: mealTypeEnum("meal_type").notNull(),
    mealDate: date("meal_date").notNull(),
    description: text("description").notNull(),
    totalCalories: integer("total_calories").notNull(),
    proteinG: numeric("protein_g"),
    carbsG: numeric("carbs_g"),
    fatG: numeric("fat_g"),
    foodItems: jsonb("food_items").$type<MealFoodItem[]>().notNull(),
    imageUrl: text("image_url"),
    confidence: text("confidence"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("meals_user_id_idx").on(table.userId),
    index("meals_date_idx").on(table.mealDate),
    index("meals_user_date_idx").on(table.userId, table.mealDate),
  ]
);

export const achievements = pgTable(
  "achievements",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    badgeType: text("badge_type").notNull(),
    badgeName: text("badge_name").notNull(),
    description: text("description").notNull(),
    earnedAt: timestamp("earned_at").defaultNow().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("achievements_user_id_idx").on(table.userId)]
);

// Tracks gateable actions (e.g. paid AI calls) so we can enforce per-user
// sliding-window rate limits. Rows are append-only; old rows are pruned by
// checkRateLimit() on each call.
export const rateLimitEvent = pgTable(
  "rate_limit_event",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    action: text("action").notNull(),
    occurredAt: timestamp("occurred_at").defaultNow().notNull(),
  },
  (table) => [
    index("rate_limit_user_action_time_idx").on(table.userId, table.action, table.occurredAt),
  ]
);
