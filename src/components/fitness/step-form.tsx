"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface StepFormProps {
  onSuccess?: () => void;
  initialSteps?: number;
  initialActiveMinutes?: number;
  initialDistanceKm?: number;
  initialCaloriesBurned?: number;
}

export function StepForm({
  onSuccess,
  initialSteps = 0,
  initialActiveMinutes = 0,
  initialDistanceKm = 0,
  initialCaloriesBurned = 0,
}: StepFormProps) {
  const [steps, setSteps] = useState(initialSteps.toString());
  const [activeMinutes, setActiveMinutes] = useState(
    initialActiveMinutes.toString()
  );
  const [distanceKm, setDistanceKm] = useState(
    initialDistanceKm ? initialDistanceKm.toString() : ""
  );
  const [caloriesBurned, setCaloriesBurned] = useState(
    initialCaloriesBurned ? initialCaloriesBurned.toString() : ""
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const stepsNum = parseInt(steps);
    if (isNaN(stepsNum) || stepsNum < 0) {
      toast.error("Please enter a valid number of steps");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: Record<string, number> = {
        steps: stepsNum,
        activeMinutes: parseInt(activeMinutes) || 0,
      };

      const distanceVal = parseFloat(distanceKm);
      if (!isNaN(distanceVal) && distanceVal >= 0) {
        payload.distanceKm = distanceVal;
      }

      const caloriesVal = parseInt(caloriesBurned);
      if (!isNaN(caloriesVal) && caloriesVal >= 0) {
        payload.caloriesBurned = caloriesVal;
      }

      const res = await fetch("/api/fitness/daily-stats/today", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save steps");
      }

      toast.success("Steps logged!");
      onSuccess?.();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save steps"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="steps-count">Steps</Label>
        <Input
          id="steps-count"
          type="number"
          min="0"
          placeholder="10000"
          value={steps}
          onChange={(e) => setSteps(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="active-minutes">Active Minutes</Label>
        <Input
          id="active-minutes"
          type="number"
          min="0"
          placeholder="60"
          value={activeMinutes}
          onChange={(e) => setActiveMinutes(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="distance-km">Distance (km)</Label>
        <Input
          id="distance-km"
          type="number"
          min="0"
          step="0.1"
          placeholder="5.0"
          value={distanceKm}
          onChange={(e) => setDistanceKm(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="calories-burned">Calories Burned</Label>
        <Input
          id="calories-burned"
          type="number"
          min="0"
          placeholder="500"
          value={caloriesBurned}
          onChange={(e) => setCaloriesBurned(e.target.value)}
        />
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : (
          "Log Steps"
        )}
      </Button>
    </form>
  );
}
