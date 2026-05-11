"use client";

import { useState, useEffect, useCallback } from "react";
import { Target, Plus, Loader2, Trash2, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { UserProfile } from "@/components/auth/user-profile";
import { GoalCard } from "@/components/fitness/goal-card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSession } from "@/lib/auth-client";
import { getLocalDateStr } from "@/lib/local-date";

interface Goal {
  id: string;
  type: string;
  targetValue: string;
  currentValue: string;
  unit: string;
  startDate: string;
  endDate: string | null;
  completed: boolean;
}

const GOAL_TYPES = [
  { value: "daily_steps", label: "Daily Steps", unit: "steps" },
  { value: "weekly_workouts", label: "Weekly Workouts", unit: "workouts" },
  { value: "monthly_calories", label: "Monthly Calories", unit: "kcal" },
  { value: "weight_target", label: "Weight Target", unit: "kg" },
];

function GoalForm({ onSuccess }: { onSuccess: () => void }) {
  const [type, setType] = useState("");
  const [targetValue, setTargetValue] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedGoalType = GOAL_TYPES.find((g) => g.value === type);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!type || !targetValue) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/fitness/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          targetValue: parseFloat(targetValue),
          unit: selectedGoalType?.unit ?? "units",
          startDate: getLocalDateStr(),
          endDate: endDate || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create goal");
      }

      toast.success("Goal created!");
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create goal");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="goal-type">Goal Type *</Label>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger id="goal-type">
            <SelectValue placeholder="Select goal type" />
          </SelectTrigger>
          <SelectContent>
            {GOAL_TYPES.map((gt) => (
              <SelectItem key={gt.value} value={gt.value}>
                {gt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="goal-target">
          Target {selectedGoalType ? `(${selectedGoalType.unit})` : ""} *
        </Label>
        <Input
          id="goal-target"
          type="number"
          min="1"
          step="any"
          placeholder="e.g. 10000"
          value={targetValue}
          onChange={(e) => setTargetValue(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="goal-end-date">End Date (optional)</Label>
        <Input
          id="goal-end-date"
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
        />
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Creating...
          </>
        ) : (
          "Create Goal"
        )}
      </Button>
    </form>
  );
}

export default function GoalsPage() {
  const { data: session, isPending } = useSession();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchGoals = useCallback(async () => {
    try {
      const res = await fetch("/api/fitness/goals");
      if (!res.ok) throw new Error("Failed to fetch goals");
      setGoals(await res.json());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load goals");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session) fetchGoals();
  }, [session, fetchGoals]);

  const handleDelete = async (goalId: string) => {
    if (!confirm("Delete this goal?")) return;
    try {
      const res = await fetch(`/api/fitness/goals/${goalId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete goal");
      toast.success("Goal deleted");
      fetchGoals();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete goal");
    }
  };

  const handleComplete = async (goalId: string) => {
    try {
      const res = await fetch(`/api/fitness/goals/${goalId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: true }),
      });
      if (!res.ok) throw new Error("Failed to complete goal");
      toast.success("Goal marked as completed!");
      fetchGoals();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update goal");
    }
  };

  if (isPending) {
    return (
      <div className="container mx-auto p-6">
        <Skeleton className="mb-6 h-8 w-48" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <p className="text-muted-foreground mb-4">Sign in to manage your goals</p>
        <UserProfile />
      </div>
    );
  }

  const activeGoals = goals.filter((g) => !g.completed);
  const completedGoals = goals.filter((g) => g.completed);

  return (
    <div className="container mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Goals</h1>
          <p className="text-muted-foreground">Set and track your fitness goals</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4" />
              New Goal
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Goal</DialogTitle>
            </DialogHeader>
            <GoalForm
              onSuccess={() => {
                setDialogOpen(false);
                fetchGoals();
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : goals.length === 0 ? (
        <div className="space-y-4 py-16 text-center">
          <div className="mx-auto w-fit rounded-full bg-yellow-500/10 p-4">
            <Target className="h-8 w-8 text-yellow-500" />
          </div>
          <h2 className="text-xl font-semibold">No goals yet</h2>
          <p className="text-muted-foreground mx-auto max-w-md">
            Setting clear fitness goals keeps you motivated. Create your first goal to get started!
          </p>
        </div>
      ) : (
        <Tabs defaultValue="active">
          <TabsList>
            <TabsTrigger value="active">Active ({activeGoals.length})</TabsTrigger>
            <TabsTrigger value="completed">Completed ({completedGoals.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="mt-4 space-y-3">
            {activeGoals.length === 0 ? (
              <p className="text-muted-foreground py-8 text-center text-sm">
                No active goals. Create one to get started!
              </p>
            ) : (
              activeGoals.map((g) => {
                const daysRemaining = g.endDate
                  ? Math.max(
                      0,
                      Math.ceil(
                        (new Date(g.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                      )
                    )
                  : null;
                return (
                  <div key={g.id} className="relative">
                    <GoalCard goal={{ ...g, daysRemaining }} />
                    <div className="absolute top-3 right-3 flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleComplete(g.id)}
                        title="Mark as completed"
                      >
                        <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleDelete(g.id)}
                        title="Delete goal"
                      >
                        <Trash2 className="text-destructive h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </TabsContent>

          <TabsContent value="completed" className="mt-4 space-y-3">
            {completedGoals.length === 0 ? (
              <p className="text-muted-foreground py-8 text-center text-sm">
                No completed goals yet. Keep pushing!
              </p>
            ) : (
              completedGoals.map((g) => (
                <div key={g.id} className="opacity-75">
                  <GoalCard goal={g} />
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
