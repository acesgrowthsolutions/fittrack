"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

/**
 * MET (Metabolic Equivalent of Task) values for common exercises.
 * Source: Compendium of Physical Activities.
 */
const WORKOUT_TYPES = [
  { value: "running", label: "Running", met: 9.8 },
  { value: "cycling", label: "Cycling", met: 7.5 },
  { value: "strength", label: "Strength", met: 6.0 },
  { value: "hiit", label: "HIIT", met: 8.0 },
  { value: "yoga", label: "Yoga", met: 3.0 },
  { value: "swimming", label: "Swimming", met: 8.0 },
  { value: "walking", label: "Walking", met: 3.8 },
  { value: "other", label: "Other", met: 5.0 },
] as const;

interface WorkoutFormProps {
  onSuccess?: () => void;
  /** User's weight in kilograms, used for auto-calculating calories burned. */
  userWeightKg?: number | null | undefined;
  /** Pre-fill values when editing an existing workout */
  initialData?: {
    id?: string;
    type?: string;
    name?: string;
    workoutDate?: string;
    durationMinutes?: number;
    caloriesBurned?: number;
    distanceKm?: string | null;
    notes?: string | null;
  };
}

/**
 * Calculates estimated calories burned using the standard MET formula.
 * Formula: (MET x weightKg x 3.5) / 200 x durationMinutes
 */
function calculateCalories(
  met: number,
  weightKg: number,
  durationMinutes: number
): number {
  return Math.round(((met * weightKg * 3.5) / 200) * durationMinutes);
}

export function WorkoutForm({
  onSuccess,
  userWeightKg,
  initialData,
}: WorkoutFormProps) {
  const isEditing = !!initialData?.id;

  const [type, setType] = useState(initialData?.type ?? "");
  const [name, setName] = useState(initialData?.name ?? "");
  const [workoutDate, setWorkoutDate] = useState(
    initialData?.workoutDate ?? new Date().toISOString().split("T")[0]
  );
  const [durationMinutes, setDurationMinutes] = useState(
    initialData?.durationMinutes?.toString() ?? ""
  );
  const [caloriesBurned, setCaloriesBurned] = useState(
    initialData?.caloriesBurned?.toString() ?? ""
  );
  const [distanceKm, setDistanceKm] = useState(initialData?.distanceKm ?? "");
  const [notes, setNotes] = useState(initialData?.notes ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // When editing an existing workout that already has calories, treat them as
  // manually set so auto-calculation does not silently overwrite saved data.
  const [caloriesManuallySet, setCaloriesManuallySet] = useState(
    () => !!initialData?.caloriesBurned
  );

  // Track whether the calories field was auto-filled so we can show a label.
  const [isAutoCalculated, setIsAutoCalculated] = useState(false);

  // Keep a ref to the previous auto-calculated value so we can detect when the
  // user edits the field to a different number (manual override).
  const lastAutoValueRef = useRef<string>("");

  // Auto-calculate calories when type or duration change and the user has not
  // manually overridden the field.
  useEffect(() => {
    if (caloriesManuallySet) return;

    const weightKg = userWeightKg;
    if (!weightKg || weightKg <= 0) return;

    const selectedType = WORKOUT_TYPES.find((wt) => wt.value === type);
    const duration = parseInt(durationMinutes, 10);

    if (!selectedType || isNaN(duration) || duration <= 0) {
      // Not enough information yet; clear auto-calculated state but don't
      // clear the field (it may already be empty).
      setIsAutoCalculated(false);
      return;
    }

    const estimated = calculateCalories(selectedType.met, weightKg, duration);
    const estimatedStr = estimated.toString();
    lastAutoValueRef.current = estimatedStr;
    setCaloriesBurned(estimatedStr);
    setIsAutoCalculated(true);
  }, [type, durationMinutes, userWeightKg, caloriesManuallySet]);

  /**
   * Handle manual calorie input. If the user types a value different from the
   * last auto-calculated one, mark calories as manually set. If they clear the
   * field, resume auto-calculation.
   */
  function handleCaloriesChange(value: string) {
    setCaloriesBurned(value);

    if (value === "") {
      // User cleared the field -- resume auto-calculation
      setCaloriesManuallySet(false);
      setIsAutoCalculated(false);
      return;
    }

    // If the value differs from the last auto-calculated value, treat it as a
    // manual override.
    if (value !== lastAutoValueRef.current) {
      setCaloriesManuallySet(true);
      setIsAutoCalculated(false);
    }
  }

  /**
   * When the user changes the exercise type or duration after a manual
   * override, resume auto-calculation so the estimate stays relevant.
   */
  function handleTypeChange(newType: string) {
    setType(newType);
    setCaloriesManuallySet(false);
  }

  function handleDurationChange(value: string) {
    setDurationMinutes(value);
    setCaloriesManuallySet(false);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!type || !name || !durationMinutes || !caloriesBurned || !workoutDate) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      const url = isEditing
        ? `/api/fitness/workouts/${initialData.id}`
        : "/api/fitness/workouts";

      const res = await fetch(url, {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          name,
          workoutDate,
          durationMinutes: parseInt(durationMinutes),
          caloriesBurned: parseInt(caloriesBurned),
          distanceKm: distanceKm ? parseFloat(distanceKm) : null,
          notes: notes || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save workout");
      }

      toast.success(isEditing ? "Workout updated!" : "Workout logged!");
      onSuccess?.();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save workout"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="workout-type">Type *</Label>
          <Select value={type} onValueChange={handleTypeChange}>
            <SelectTrigger id="workout-type">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {WORKOUT_TYPES.map((wt) => (
                <SelectItem key={wt.value} value={wt.value}>
                  {wt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="workout-date">Date *</Label>
          <Input
            id="workout-date"
            type="date"
            value={workoutDate}
            onChange={(e) => setWorkoutDate(e.target.value)}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="workout-name">Name *</Label>
        <Input
          id="workout-name"
          placeholder="e.g. Morning Run"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="workout-duration">Duration (min) *</Label>
          <Input
            id="workout-duration"
            type="number"
            min="1"
            placeholder="30"
            value={durationMinutes}
            onChange={(e) => handleDurationChange(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="workout-calories">Calories *</Label>
            {isAutoCalculated && (
              <span className="text-xs text-muted-foreground">
                Auto-calculated
              </span>
            )}
          </div>
          <Input
            id="workout-calories"
            type="number"
            min="0"
            placeholder="250"
            value={caloriesBurned}
            onChange={(e) => handleCaloriesChange(e.target.value)}
            required
          />
          {!userWeightKg && (
            <p className="text-xs text-muted-foreground">
              Add your weight in Profile for auto-calculation
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="workout-distance">Distance (km)</Label>
          <Input
            id="workout-distance"
            type="number"
            min="0"
            step="0.1"
            placeholder="5.0"
            value={distanceKm}
            onChange={(e) => setDistanceKm(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="workout-notes">Notes</Label>
        <Textarea
          id="workout-notes"
          placeholder="How did it go?"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
        />
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : isEditing ? (
          "Update Workout"
        ) : (
          "Log Workout"
        )}
      </Button>
    </form>
  );
}
