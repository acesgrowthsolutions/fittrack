/**
 * MET (Metabolic Equivalent of Task) values for the workout types this app
 * supports. Source: Compendium of Physical Activities (Ainsworth et al.).
 * The `value` field matches workoutTypeEnum in src/lib/schema.ts.
 *
 * Single source of truth for calorie estimation — workout-form, workout-timer,
 * and the standalone calculator all consume this. Drift across copies would
 * surface as silently disagreeing calorie totals between, e.g., the live
 * timer and the saved row.
 */
export const WORKOUT_MET_VALUES = [
  { value: "running", label: "Running", met: 9.8 },
  { value: "cycling", label: "Cycling", met: 7.5 },
  { value: "strength", label: "Strength", met: 6.0 },
  { value: "hiit", label: "HIIT", met: 8.0 },
  { value: "yoga", label: "Yoga", met: 3.0 },
  { value: "swimming", label: "Swimming", met: 8.0 },
  { value: "walking", label: "Walking", met: 3.8 },
  { value: "other", label: "Other", met: 5.0 },
] as const;

export type WorkoutMetEntry = (typeof WORKOUT_MET_VALUES)[number];

/**
 * Calories burned per minute for a given MET value and body weight (kg).
 * Standard MET formula: (MET × weightKg × 3.5) / 200.
 */
export function caloriesPerMinute(met: number, weightKg: number): number {
  return (met * weightKg * 3.5) / 200;
}

/**
 * Total calories burned for a workout. Returns a raw number — callers decide
 * whether to round (the timer keeps fractional live values; the form rounds
 * before saving).
 */
export function calculateCalories(met: number, weightKg: number, durationMinutes: number): number {
  return caloriesPerMinute(met, weightKg) * durationMinutes;
}
