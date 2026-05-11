"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Calculator, Flame } from "lucide-react";
import { UserProfile } from "@/components/auth/user-profile";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSession } from "@/lib/auth-client";
import { caloriesPerMinute, WORKOUT_MET_VALUES } from "@/lib/met-values";

type WeightUnit = "kg" | "lbs";

const LBS_TO_KG = 0.453592;

export default function CalculatorPage() {
  const { data: session, isPending } = useSession();

  const [exerciseType, setExerciseType] = useState<string>("");
  const [weight, setWeight] = useState<string>("");
  const [weightUnit, setWeightUnit] = useState<WeightUnit>("lbs");
  const [duration, setDuration] = useState<string>("");
  const [showResults, setShowResults] = useState(false);

  const selectedExercise = useMemo(
    () => WORKOUT_MET_VALUES.find((e) => e.value === exerciseType),
    [exerciseType]
  );

  const results = useMemo(() => {
    const weightNum = parseFloat(weight);
    const durationNum = parseFloat(duration);

    if (!selectedExercise || isNaN(weightNum) || weightNum <= 0) {
      return null;
    }

    const weightKg = weightUnit === "lbs" ? weightNum * LBS_TO_KG : weightNum;
    const calPerMin = caloriesPerMinute(selectedExercise.met, weightKg);

    // Only include total if duration is valid
    const totalCal = !isNaN(durationNum) && durationNum > 0 ? calPerMin * durationNum : null;

    return { calPerMin, totalCal, met: selectedExercise.met };
  }, [selectedExercise, weight, weightUnit, duration]);

  const isFormValid = exerciseType !== "" && weight !== "" && parseFloat(weight) > 0;

  function handleCalculate() {
    setShowResults(true);
  }

  function handleReset() {
    setExerciseType("");
    setWeight("");
    setWeightUnit("lbs");
    setDuration("");
    setShowResults(false);
  }

  if (isPending) {
    return (
      <div className="container mx-auto p-6">
        <div className="mx-auto max-w-lg space-y-4">
          <div className="bg-muted h-8 w-64 animate-pulse rounded" />
          <div className="bg-muted h-96 animate-pulse rounded" />
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <p className="text-muted-foreground mb-4">Sign in to use the calorie calculator</p>
        <UserProfile />
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Calorie Calculator</h1>
        <p className="text-muted-foreground">
          Estimate calories burned per minute for any exercise
        </p>
      </div>

      <div className="mx-auto max-w-lg space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calculator className="h-5 w-5" />
              Exercise Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Exercise Type */}
            <div className="space-y-2">
              <Label htmlFor="exercise-type">Exercise Type</Label>
              <Select value={exerciseType} onValueChange={setExerciseType}>
                <SelectTrigger id="exercise-type" className="w-full">
                  <SelectValue placeholder="Select an exercise" />
                </SelectTrigger>
                <SelectContent>
                  {WORKOUT_MET_VALUES.map((exercise) => (
                    <SelectItem key={exercise.value} value={exercise.value}>
                      {exercise.label} (MET: {exercise.met})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Weight */}
            <div className="space-y-2">
              <Label htmlFor="weight">Body Weight</Label>
              <div className="flex gap-2">
                <Input
                  id="weight"
                  type="number"
                  min="1"
                  step="0.1"
                  placeholder="Enter weight"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="flex-1"
                />
                <Select value={weightUnit} onValueChange={(v) => setWeightUnit(v as WeightUnit)}>
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lbs">lbs</SelectItem>
                    <SelectItem value="kg">kg</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Duration */}
            <div className="space-y-2">
              <Label htmlFor="duration">
                Duration (minutes){" "}
                <span className="text-muted-foreground font-normal">- optional</span>
              </Label>
              <Input
                id="duration"
                type="number"
                min="1"
                step="1"
                placeholder="e.g. 30"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button onClick={handleCalculate} disabled={!isFormValid} className="flex-1">
                <Flame className="h-4 w-4" />
                Calculate
              </Button>
              <Button variant="outline" onClick={handleReset}>
                Reset
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tip */}
        <p className="text-muted-foreground text-center text-sm">
          Tip: Calories are also auto-calculated when you{" "}
          <Link href="/workouts" className="hover:text-foreground underline">
            log a workout
          </Link>
          .
        </p>

        {/* Results */}
        {showResults && results && (
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Flame className="h-5 w-5 text-orange-500" />
                Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4">
                {/* Calories per minute */}
                <div className="rounded-lg bg-orange-500/10 p-4 text-center">
                  <p className="text-muted-foreground mb-1 text-sm font-medium">
                    Calories Burned Per Minute
                  </p>
                  <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                    {results.calPerMin.toFixed(2)}
                  </p>
                  <p className="text-muted-foreground mt-1 text-xs">kcal/min</p>
                </div>

                {/* Total calories (shown only when duration is provided) */}
                {results.totalCal !== null && (
                  <div className="rounded-lg bg-green-500/10 p-4 text-center">
                    <p className="text-muted-foreground mb-1 text-sm font-medium">
                      Total Calories Burned
                    </p>
                    <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                      {Math.round(results.totalCal).toLocaleString()}
                    </p>
                    <p className="text-muted-foreground mt-1 text-xs">kcal in {duration} minutes</p>
                  </div>
                )}

                {/* MET info */}
                <p className="text-muted-foreground text-center text-xs">
                  Based on MET value of {results.met} for {selectedExercise?.label}. Formula: (MET x
                  weight in kg x 3.5) / 200.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
