import { describe, it, expect } from "vitest";
import {
  dailyStatsSetSchema,
  dateString,
  goalCreateSchema,
  goalUpdateSchema,
  profileUpsertSchema,
  workoutCreateSchema,
  workoutUpdateSchema,
} from "@/lib/validators/fitness";

describe("dateString", () => {
  it("accepts a valid YYYY-MM-DD", () => {
    expect(dateString.safeParse("2026-05-11").success).toBe(true);
  });

  it("rejects shape mismatches", () => {
    expect(dateString.safeParse("2026-5-11").success).toBe(false);
    expect(dateString.safeParse("05/11/2026").success).toBe(false);
    expect(dateString.safeParse("").success).toBe(false);
  });

  it("rejects shape-valid but impossible dates", () => {
    expect(dateString.safeParse("2026-13-01").success).toBe(false); // month 13
    expect(dateString.safeParse("2026-02-30").success).toBe(false); // Feb 30
    expect(dateString.safeParse("2026-13-99").success).toBe(false); // both
  });
});

describe("workoutCreateSchema", () => {
  const valid = {
    type: "running" as const,
    name: "Morning run",
    durationMinutes: 30,
    caloriesBurned: 300,
    distanceKm: 5,
    workoutDate: "2026-05-11",
  };

  it("accepts a complete valid payload", () => {
    expect(workoutCreateSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects negative durationMinutes", () => {
    expect(workoutCreateSchema.safeParse({ ...valid, durationMinutes: -10 }).success).toBe(false);
  });

  it("rejects durationMinutes above a day", () => {
    expect(workoutCreateSchema.safeParse({ ...valid, durationMinutes: 2000 }).success).toBe(false);
  });

  it("rejects unknown workout type", () => {
    expect(workoutCreateSchema.safeParse({ ...valid, type: "banana" }).success).toBe(false);
  });

  it("rejects empty name", () => {
    expect(workoutCreateSchema.safeParse({ ...valid, name: "" }).success).toBe(false);
  });

  it("rejects 300-char name (over 200 cap)", () => {
    expect(workoutCreateSchema.safeParse({ ...valid, name: "x".repeat(300) }).success).toBe(false);
  });

  it("rejects invalid workoutDate", () => {
    expect(workoutCreateSchema.safeParse({ ...valid, workoutDate: "not-a-date" }).success).toBe(
      false
    );
    expect(workoutCreateSchema.safeParse({ ...valid, workoutDate: "2026-13-99" }).success).toBe(
      false
    );
  });

  it("rejects negative caloriesBurned", () => {
    expect(workoutCreateSchema.safeParse({ ...valid, caloriesBurned: -1 }).success).toBe(false);
  });
});

describe("workoutUpdateSchema", () => {
  it("accepts an empty body (existing behavior: bumps updatedAt only)", () => {
    expect(workoutUpdateSchema.safeParse({}).success).toBe(true);
  });

  it("accepts partial update with valid fields", () => {
    expect(workoutUpdateSchema.safeParse({ name: "Edited" }).success).toBe(true);
  });

  it("rejects partial update with one bad field", () => {
    expect(workoutUpdateSchema.safeParse({ durationMinutes: -5 }).success).toBe(false);
  });
});

describe("goalCreateSchema", () => {
  it("rejects unknown goal type", () => {
    const r = goalCreateSchema.safeParse({
      type: "lose_weight",
      targetValue: 10,
      unit: "kg",
      startDate: "2026-05-11",
    });
    expect(r.success).toBe(false);
  });

  it("rejects negative targetValue", () => {
    const r = goalCreateSchema.safeParse({
      type: "daily_steps",
      targetValue: -100,
      unit: "steps",
      startDate: "2026-05-11",
    });
    expect(r.success).toBe(false);
  });
});

describe("goalUpdateSchema", () => {
  it("rejects non-boolean completed", () => {
    expect(goalUpdateSchema.safeParse({ completed: "yes" }).success).toBe(false);
  });
});

describe("profileUpsertSchema", () => {
  it("rejects age out of range", () => {
    expect(profileUpsertSchema.safeParse({ age: -5 }).success).toBe(false);
    expect(profileUpsertSchema.safeParse({ age: 1e9 }).success).toBe(false);
  });

  it("rejects unknown activityLevel", () => {
    expect(profileUpsertSchema.safeParse({ activityLevel: "casual" }).success).toBe(false);
  });

  it("rejects unrealistic dailyStepGoal", () => {
    expect(profileUpsertSchema.safeParse({ dailyStepGoal: 0 }).success).toBe(false);
    expect(profileUpsertSchema.safeParse({ dailyStepGoal: 1e9 }).success).toBe(false);
  });
});

describe("dailyStatsSetSchema", () => {
  it("rejects more steps than humanly possible in a day", () => {
    expect(dailyStatsSetSchema.safeParse({ steps: 500_000 }).success).toBe(false);
  });

  it("rejects activeMinutes greater than minutes in a day", () => {
    expect(dailyStatsSetSchema.safeParse({ activeMinutes: 2000 }).success).toBe(false);
  });
});
