"use client";

import { useEffect, useRef, useState } from "react";
import {
  Activity,
  Bike,
  Dumbbell,
  Flame,
  Footprints,
  Heart,
  Pause,
  Play,
  RotateCcw,
  Square,
  Timer,
  Waves,
  Zap,
} from "lucide-react";
import { WorkoutForm } from "@/components/fitness/workout-form";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { LucideIcon } from "lucide-react";

type Phase = "idle" | "running" | "paused" | "stopped";

/**
 * MET (Metabolic Equivalent of Task) values for common exercises.
 * Mirrors the values in WorkoutForm to keep calorie calculations consistent.
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

const WORKOUT_ICONS: Record<string, LucideIcon> = {
  running: Footprints,
  cycling: Bike,
  strength: Dumbbell,
  hiit: Zap,
  yoga: Heart,
  swimming: Waves,
  walking: Footprints,
  other: Activity,
};

interface WorkoutTimerProps {
  onSaved?: () => void;
  /** User's weight in kilograms, forwarded to WorkoutForm for calorie auto-calculation. */
  userWeightKg?: number | null;
}

function formatTime(totalMs: number): string {
  const totalSeconds = Math.floor(totalMs / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

/**
 * Calculates estimated calories burned using the standard MET formula.
 * Formula: (MET x weightKg x 3.5) / 200 x durationMinutes
 */
function calculateCalories(met: number, weightKg: number, durationMinutes: number): number {
  return ((met * weightKg * 3.5) / 200) * durationMinutes;
}

/**
 * Returns a motivational message based on total calories burned.
 */
function getMotivationalMessage(calories: number): string {
  if (calories >= 500) return "Beast mode!";
  if (calories >= 300) return "Impressive burn!";
  if (calories >= 100) return "Great workout!";
  return "Every bit counts!";
}

export function WorkoutTimer({ onSaved, userWeightKg }: WorkoutTimerProps) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [exerciseType, setExerciseType] = useState("");
  const startRef = useRef<number | null>(null);
  const accumulatedRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  const selectedWorkout = WORKOUT_TYPES.find((wt) => wt.value === exerciseType);
  const canTrackCalories = !!userWeightKg && userWeightKg > 0 && !!selectedWorkout;

  useEffect(() => {
    if (phase !== "running") return;

    const tick = () => {
      if (startRef.current != null) {
        setElapsedMs(accumulatedRef.current + (performance.now() - startRef.current));
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [phase]);

  // Compute live calorie values from current elapsed time
  const durationMinutesLive = elapsedMs / 60000;
  const liveCalories = canTrackCalories
    ? calculateCalories(selectedWorkout.met, userWeightKg, durationMinutesLive)
    : 0;
  const calPerMin = canTrackCalories ? (selectedWorkout.met * userWeightKg * 3.5) / 200 : 0;

  const handleStart = () => {
    accumulatedRef.current = 0;
    startRef.current = performance.now();
    setElapsedMs(0);
    setPhase("running");
  };

  const handlePause = () => {
    if (startRef.current != null) {
      accumulatedRef.current += performance.now() - startRef.current;
      startRef.current = null;
    }
    setPhase("paused");
  };

  const handleResume = () => {
    startRef.current = performance.now();
    setPhase("running");
  };

  const handleStop = () => {
    if (startRef.current != null) {
      accumulatedRef.current += performance.now() - startRef.current;
      startRef.current = null;
    }
    setElapsedMs(accumulatedRef.current);
    setPhase("stopped");
  };

  const handleReset = () => {
    startRef.current = null;
    accumulatedRef.current = 0;
    setElapsedMs(0);
    setExerciseType("");
    setPhase("idle");
  };

  if (phase === "stopped") {
    const durationMinutes = Math.max(1, Math.round(elapsedMs / 60000));
    const totalCalories = canTrackCalories
      ? Math.round(calculateCalories(selectedWorkout.met, userWeightKg, elapsedMs / 60000))
      : undefined;
    const ExerciseIcon = WORKOUT_ICONS[exerciseType] ?? Activity;
    const exerciseLabel = selectedWorkout?.label ?? exerciseType;

    return (
      <div className="space-y-4">
        {/* Recorded time */}
        <div className="bg-muted/30 rounded-lg border p-4 text-center">
          <p className="text-muted-foreground text-xs tracking-wide uppercase">Recorded time</p>
          <p className="font-mono text-3xl font-bold tabular-nums">{formatTime(elapsedMs)}</p>
          <p className="text-muted-foreground mt-1 text-xs">
            Rounded to {durationMinutes} min for logging
          </p>
        </div>

        {/* Post-workout summary card */}
        <div className="bg-muted/10 space-y-4 rounded-lg border p-5">
          <p className="text-muted-foreground text-center text-xs tracking-wide uppercase">
            Workout Summary
          </p>

          {/* Exercise type */}
          <div className="flex items-center justify-center gap-2">
            <ExerciseIcon className="text-muted-foreground h-5 w-5" />
            <span className="text-sm font-medium">{exerciseLabel}</span>
          </div>

          {canTrackCalories && totalCalories != null ? (
            <>
              {/* Total calories — prominent */}
              <div className="flex flex-col items-center gap-1">
                <div className="flex items-center gap-2">
                  <Flame className="h-7 w-7 text-orange-500" />
                  <span className="text-4xl font-bold text-orange-500 tabular-nums">
                    {totalCalories}
                  </span>
                  <span className="text-muted-foreground text-lg">kcal</span>
                </div>
                <p className="text-muted-foreground text-xs">{calPerMin.toFixed(1)} cal/min</p>
              </div>

              {/* Motivational message */}
              <p className="text-muted-foreground text-center text-sm font-medium">
                {getMotivationalMessage(totalCalories)}
              </p>
            </>
          ) : (
            <p className="text-muted-foreground text-center text-xs">
              Set your weight in Profile to see calorie tracking
            </p>
          )}
        </div>

        {/* Pre-filled workout form */}
        <WorkoutForm
          userWeightKg={userWeightKg}
          initialData={{
            ...(exerciseType ? { type: exerciseType } : {}),
            durationMinutes,
            ...(totalCalories != null ? { caloriesBurned: totalCalories } : {}),
          }}
          onSuccess={() => {
            handleReset();
            onSaved?.();
          }}
        />
        <Button variant="ghost" className="w-full" onClick={handleReset}>
          <RotateCcw className="h-4 w-4" />
          Discard and restart
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center space-y-3 py-4">
        <div className="rounded-full bg-purple-500/10 p-4">
          <Timer className="h-8 w-8 text-purple-500" />
        </div>
        <p className="font-mono text-5xl font-bold tabular-nums">{formatTime(elapsedMs)}</p>
        <p className="text-muted-foreground text-sm">
          {phase === "idle" && "Ready to start"}
          {phase === "running" && "Workout in progress"}
          {phase === "paused" && "Paused"}
        </p>

        {/* Live calorie counter while running or paused */}
        {(phase === "running" || phase === "paused") &&
          (canTrackCalories ? (
            <div className="flex flex-col items-center gap-0.5">
              <div className="flex items-center gap-1.5">
                <Flame className="h-5 w-5 text-orange-500" />
                <span className="text-2xl font-bold text-orange-500 tabular-nums">
                  {Math.round(liveCalories)}
                </span>
                <span className="text-muted-foreground text-sm">kcal</span>
              </div>
              <p className="text-muted-foreground text-xs">{calPerMin.toFixed(1)} cal/min</p>
            </div>
          ) : !userWeightKg ? (
            <p className="text-muted-foreground text-xs">
              Set your weight in Profile to see live calorie tracking
            </p>
          ) : null)}
      </div>

      {/* Exercise type selector — shown only in idle phase */}
      {phase === "idle" && (
        <div className="space-y-2">
          <label className="text-muted-foreground text-sm font-medium">Exercise type</label>
          <Select value={exerciseType} onValueChange={setExerciseType}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select exercise type" />
            </SelectTrigger>
            <SelectContent>
              {WORKOUT_TYPES.map((wt) => {
                const Icon = WORKOUT_ICONS[wt.value] ?? Activity;
                return (
                  <SelectItem key={wt.value} value={wt.value}>
                    <Icon className="h-4 w-4" />
                    {wt.label}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="flex gap-2">
        {phase === "idle" && (
          <Button className="flex-1" onClick={handleStart} disabled={!exerciseType}>
            <Play className="h-4 w-4" />
            Start
          </Button>
        )}

        {phase === "running" && (
          <>
            <Button variant="outline" className="flex-1" onClick={handlePause}>
              <Pause className="h-4 w-4" />
              Pause
            </Button>
            <Button variant="destructive" className="flex-1" onClick={handleStop}>
              <Square className="h-4 w-4" />
              Stop
            </Button>
          </>
        )}

        {phase === "paused" && (
          <>
            <Button className="flex-1" onClick={handleResume}>
              <Play className="h-4 w-4" />
              Resume
            </Button>
            <Button variant="destructive" className="flex-1" onClick={handleStop}>
              <Square className="h-4 w-4" />
              Stop
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
