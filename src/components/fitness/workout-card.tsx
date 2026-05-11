"use client";

import { Bike, Dumbbell, Flame, Footprints, Heart, Waves, Zap, Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";

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

const WORKOUT_COLORS: Record<string, string> = {
  running: "bg-blue-500/10 text-blue-500",
  cycling: "bg-green-500/10 text-green-500",
  strength: "bg-purple-500/10 text-purple-500",
  hiit: "bg-red-500/10 text-red-500",
  yoga: "bg-pink-500/10 text-pink-500",
  swimming: "bg-cyan-500/10 text-cyan-500",
  walking: "bg-teal-500/10 text-teal-500",
  other: "bg-gray-500/10 text-gray-500",
};

interface WorkoutCardProps {
  workout: {
    id: string;
    type: string;
    name: string;
    durationMinutes: number;
    caloriesBurned: number;
    distanceKm: string | null;
    workoutDate: string;
  };
  onClick?: () => void;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function WorkoutCard({ workout, onClick }: WorkoutCardProps) {
  const Icon = WORKOUT_ICONS[workout.type] ?? Activity;
  const iconColor = WORKOUT_COLORS[workout.type] ?? WORKOUT_COLORS.other;

  return (
    <Card
      className={onClick ? "cursor-pointer transition-shadow hover:shadow-md" : ""}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`rounded-lg p-2 ${iconColor}`}>
            <Icon className="h-5 w-5" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate font-medium">{workout.name}</p>
              <Badge variant="secondary" className="shrink-0 text-xs">
                {workout.type}
              </Badge>
            </div>
            <p className="text-muted-foreground text-sm">{formatDate(workout.workoutDate)}</p>
          </div>

          <div className="shrink-0 text-right text-sm">
            <p className="font-medium">{workout.durationMinutes} min</p>
            <div className="text-muted-foreground flex items-center gap-1">
              <Flame className="h-3 w-3 text-orange-500" />
              <span>{workout.caloriesBurned} kcal</span>
            </div>
            {workout.distanceKm && parseFloat(workout.distanceKm) > 0 && (
              <p className="text-muted-foreground">
                {parseFloat(workout.distanceKm).toFixed(1)} km
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
