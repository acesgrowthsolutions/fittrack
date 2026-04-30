"use client";

import { Target, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

const GOAL_TYPE_LABELS: Record<string, string> = {
  daily_steps: "Daily Steps",
  weekly_workouts: "Weekly Workouts",
  monthly_calories: "Monthly Calories",
  weight_target: "Weight Target",
};

interface GoalCardProps {
  goal: {
    id: string;
    type: string;
    targetValue: string;
    currentValue: string;
    unit: string;
    startDate: string;
    endDate: string | null;
    completed: boolean;
    progress?: number;
    daysRemaining?: number | null;
  };
}

export function GoalCard({ goal }: GoalCardProps) {
  const target = parseFloat(goal.targetValue);
  const current = parseFloat(goal.currentValue);
  const progress = goal.progress ?? (target > 0 ? Math.min((current / target) * 100, 100) : 0);

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-yellow-500/10 p-2">
              <Target className="h-4 w-4 text-yellow-500" />
            </div>
            <div>
              <p className="font-medium text-sm">
                {GOAL_TYPE_LABELS[goal.type] ?? goal.type}
              </p>
              <p className="text-xs text-muted-foreground">
                {current.toLocaleString()} / {target.toLocaleString()} {goal.unit}
              </p>
            </div>
          </div>
          {goal.completed ? (
            <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
              Completed
            </Badge>
          ) : goal.daysRemaining != null ? (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span>
                {goal.daysRemaining === 0
                  ? "Ends today"
                  : `${goal.daysRemaining}d left`}
              </span>
            </div>
          ) : null}
        </div>

        <div className="space-y-1">
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-muted-foreground text-right">
            {Math.round(progress)}%
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
