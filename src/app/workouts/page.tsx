"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Dumbbell, Plus, Loader2, Timer } from "lucide-react";
import { toast } from "sonner";
import { UserProfile } from "@/components/auth/user-profile";
import { WorkoutCard } from "@/components/fitness/workout-card";
import { WorkoutForm } from "@/components/fitness/workout-form";
import { WorkoutTimer } from "@/components/fitness/workout-timer";
import { WorkoutTotals, type WorkoutTotalsData } from "@/components/fitness/workout-totals";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/lib/auth-client";

interface Workout {
  id: string;
  type: string;
  name: string;
  durationMinutes: number;
  caloriesBurned: number;
  distanceKm: string | null;
  workoutDate: string;
  notes: string | null;
}

const WORKOUT_TYPES = [
  { value: "all", label: "All Types" },
  { value: "running", label: "Running" },
  { value: "cycling", label: "Cycling" },
  { value: "strength", label: "Strength" },
  { value: "hiit", label: "HIIT" },
  { value: "yoga", label: "Yoga" },
  { value: "swimming", label: "Swimming" },
  { value: "walking", label: "Walking" },
  { value: "other", label: "Other" },
];

const PAGE_SIZE = 20;

export default function WorkoutsPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("all");
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [timerOpen, setTimerOpen] = useState(false);
  const [userWeightKg, setUserWeightKg] = useState<number | null>(null);
  const [totals, setTotals] = useState<WorkoutTotalsData | null>(null);
  const [totalsLoading, setTotalsLoading] = useState(true);

  const fetchWorkouts = useCallback(async (newOffset = 0, append = false, type = "all") => {
    try {
      if (newOffset === 0) setLoading(true);
      else setLoadingMore(true);

      const params = new URLSearchParams({
        limit: PAGE_SIZE.toString(),
        offset: newOffset.toString(),
      });
      if (type !== "all") {
        params.set("type", type);
      }

      const res = await fetch(`/api/fitness/workouts?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch workouts");
      const data: Workout[] = await res.json();

      if (append) {
        setWorkouts((prev) => [...prev, ...data]);
      } else {
        setWorkouts(data);
      }
      setHasMore(data.length === PAGE_SIZE);
      setOffset(newOffset + data.length);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load workouts");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  const fetchTotals = useCallback(async () => {
    try {
      setTotalsLoading(true);
      const res = await fetch("/api/fitness/workouts/totals");
      if (!res.ok) throw new Error("Failed to fetch workout totals");
      const data: WorkoutTotalsData = await res.json();
      setTotals(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load workout totals");
    } finally {
      setTotalsLoading(false);
    }
  }, []);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch("/api/fitness/profile");
      if (!res.ok) return;
      const profile = await res.json();
      if (profile?.weight) {
        const raw = parseFloat(profile.weight);
        if (!isNaN(raw) && raw > 0) {
          // Convert to kg if the user stores weight in imperial (lbs)
          const kg = profile.preferredUnits === "imperial" ? raw * 0.453592 : raw;
          setUserWeightKg(kg);
        }
      }
    } catch {
      // Profile fetch is best-effort; auto-calculation simply won't activate
    }
  }, []);

  useEffect(() => {
    if (session) {
      fetchWorkouts(0, false, typeFilter);
      fetchProfile();
      fetchTotals();
    }
  }, [session, fetchWorkouts, fetchProfile, fetchTotals, typeFilter]);

  if (isPending) {
    return (
      <div className="container mx-auto p-6">
        <Skeleton className="mb-6 h-8 w-48" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <p className="text-muted-foreground mb-4">Sign in to view your workouts</p>
        <UserProfile />
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Workouts</h1>
          <p className="text-muted-foreground">Your workout history and logging</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={timerOpen} onOpenChange={setTimerOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Timer className="h-4 w-4" />
                Start Timer
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Workout Timer</DialogTitle>
              </DialogHeader>
              <WorkoutTimer
                userWeightKg={userWeightKg}
                onSaved={() => {
                  setTimerOpen(false);
                  fetchWorkouts(0);
                  fetchTotals();
                }}
              />
            </DialogContent>
          </Dialog>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4" />
                Log Workout
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Log Workout</DialogTitle>
              </DialogHeader>
              <WorkoutForm
                userWeightKg={userWeightKg}
                onSuccess={() => {
                  setDialogOpen(false);
                  fetchWorkouts(0);
                  fetchTotals();
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Totals */}
      <WorkoutTotals totals={totals} loading={totalsLoading} />

      {/* Filters */}
      <div className="flex items-center gap-4">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            {WORKOUT_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Workout List */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : workouts.length === 0 ? (
        <div className="space-y-4 py-16 text-center">
          <div className="mx-auto w-fit rounded-full bg-purple-500/10 p-4">
            <Dumbbell className="h-8 w-8 text-purple-500" />
          </div>
          <h2 className="text-xl font-semibold">No workouts yet</h2>
          <p className="text-muted-foreground mx-auto max-w-md">
            Every journey starts with a single step. Log your first workout to begin tracking your
            progress!
          </p>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4" />
                Log Your First Workout
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Log Workout</DialogTitle>
              </DialogHeader>
              <WorkoutForm
                userWeightKg={userWeightKg}
                onSuccess={() => {
                  setDialogOpen(false);
                  fetchWorkouts(0);
                  fetchTotals();
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
      ) : (
        <div className="space-y-3">
          {workouts.map((w) => (
            <WorkoutCard key={w.id} workout={w} onClick={() => router.push(`/workouts/${w.id}`)} />
          ))}

          {hasMore && (
            <div className="flex justify-center pt-4">
              <Button
                variant="outline"
                onClick={() => fetchWorkouts(offset, true, typeFilter)}
                disabled={loadingMore}
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  "Load More"
                )}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
