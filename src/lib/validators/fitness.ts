import { z } from "zod";
import { activityLevelEnum, goalTypeEnum, preferredUnitsEnum, workoutTypeEnum } from "@/lib/schema";

// `YYYY-MM-DD` calendar date. The shape regex catches obvious garbage like
// "2026-13-99"; the refine catches valid-shape-but-invalid-day inputs like
// "2026-02-30" by round-tripping through Date.UTC and confirming each field
// survives unchanged (Date's auto-rollover would otherwise convert it).
export const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD")
  .refine((s) => {
    const [y, m, d] = s.split("-").map(Number);
    if (y === undefined || m === undefined || d === undefined) return false;
    const dt = new Date(Date.UTC(y, m - 1, d));
    return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
  }, "Invalid calendar date");

// Cap text-ish fields well below Postgres text limits so a single user can't
// bloat their own table or response payloads.
const shortText = z.string().trim().min(1).max(200);
const longText = z.string().trim().max(2000);

export const workoutCreateSchema = z.object({
  type: z.enum(workoutTypeEnum.enumValues),
  name: shortText,
  durationMinutes: z.number().int().min(1).max(1440),
  caloriesBurned: z.number().int().min(0).max(50_000),
  distanceKm: z.number().min(0).max(1000).optional().nullable(),
  notes: longText.optional().nullable(),
  workoutDate: dateString,
});

export const workoutUpdateSchema = z.object({
  type: z.enum(workoutTypeEnum.enumValues).optional(),
  name: shortText.optional(),
  durationMinutes: z.number().int().min(1).max(1440).optional(),
  caloriesBurned: z.number().int().min(0).max(50_000).optional(),
  distanceKm: z.number().min(0).max(1000).nullable().optional(),
  notes: longText.nullable().optional(),
  workoutDate: dateString.optional(),
});

export const goalCreateSchema = z.object({
  type: z.enum(goalTypeEnum.enumValues),
  targetValue: z.number().min(0).max(1_000_000_000),
  unit: z.string().trim().min(1).max(30),
  startDate: dateString,
  endDate: dateString.nullable().optional(),
});

export const goalUpdateSchema = z.object({
  currentValue: z.number().min(0).max(1_000_000_000).optional(),
  completed: z.boolean().optional(),
  targetValue: z.number().min(0).max(1_000_000_000).optional(),
  endDate: dateString.nullable().optional(),
});

export const profileUpsertSchema = z.object({
  height: z.number().min(0).max(400).optional().nullable(),
  weight: z.number().min(0).max(1000).optional().nullable(),
  age: z.number().int().min(1).max(150).optional().nullable(),
  activityLevel: z.enum(activityLevelEnum.enumValues).optional(),
  dailyStepGoal: z.number().int().min(1).max(500_000).optional(),
  dailyCalorieGoal: z.number().int().min(1).max(50_000).optional(),
  preferredUnits: z.enum(preferredUnitsEnum.enumValues).optional(),
});

export const dailyStatsSetSchema = z.object({
  steps: z.number().int().min(0).max(200_000).optional(),
  distanceKm: z.number().min(0).max(500).optional(),
  caloriesBurned: z.number().int().min(0).max(20_000).optional(),
  activeMinutes: z.number().int().min(0).max(1440).optional(),
});

export type ParseResult<T> = { ok: true; data: T } | { ok: false; response: Response };

// One-shot helper: parse JSON, validate against a schema, and on failure
// return a 400 Response with field-level errors. Routes call this and `return
// result.response` immediately on failure, keeping per-route boilerplate to
// two lines.
export async function parseJsonBody<T>(
  req: Request,
  schema: z.ZodType<T>
): Promise<ParseResult<T>> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return {
      ok: false,
      response: Response.json({ error: "Invalid JSON" }, { status: 400 }),
    };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      response: Response.json(
        { error: "Invalid body", details: z.flattenError(parsed.error).fieldErrors },
        { status: 400 }
      ),
    };
  }
  return { ok: true, data: parsed.data };
}
