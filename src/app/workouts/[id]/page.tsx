"use client";

import { useState, useEffect, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Clock, Flame, MapPin, Calendar, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { WorkoutForm } from "@/components/fitness/workout-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  createdAt: string;
}

export default function WorkoutDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [userWeightKg, setUserWeightKg] = useState<number | null>(null);

  const fetchWorkout = useCallback(async () => {
    try {
      const res = await fetch(`/api/fitness/workouts/${id}`);
      if (res.status === 404) {
        toast.error("Workout not found");
        router.push("/workouts");
        return;
      }
      if (!res.ok) throw new Error("Failed to fetch workout");
      setWorkout(await res.json());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load workout");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch("/api/fitness/profile");
      if (!res.ok) return;
      const profile = await res.json();
      if (profile?.weight) {
        const raw = parseFloat(profile.weight);
        if (!isNaN(raw) && raw > 0) {
          const kg = profile.preferredUnits === "imperial" ? raw * 0.453592 : raw;
          setUserWeightKg(kg);
        }
      }
    } catch {
      // Best-effort; auto-calculation simply won't activate
    }
  }, []);

  useEffect(() => {
    if (session) {
      fetchWorkout();
      fetchProfile();
    }
  }, [session, fetchWorkout, fetchProfile]);

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this workout?")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/fitness/workouts/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete workout");
      toast.success("Workout deleted");
      router.push("/workouts");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete workout");
      setDeleting(false);
    }
  };

  if (isPending || loading) {
    return (
      <div className="container mx-auto max-w-2xl space-y-6 p-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="container mx-auto p-6 text-center">
        <p className="text-muted-foreground">Sign in to view this workout</p>
      </div>
    );
  }

  if (!workout) return null;

  const formattedDate = new Date(workout.workoutDate + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="container mx-auto max-w-2xl space-y-6 p-6">
      {/* Back Button */}
      <Button variant="ghost" size="sm" onClick={() => router.push("/workouts")}>
        <ArrowLeft className="h-4 w-4" />
        Back to Workouts
      </Button>

      {/* Workout Details */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <div className="mb-1 flex items-center gap-2">
                <CardTitle className="text-xl">{workout.name}</CardTitle>
                <Badge variant="secondary">{workout.type}</Badge>
              </div>
              <div className="text-muted-foreground flex items-center gap-1 text-sm">
                <Calendar className="h-3.5 w-3.5" />
                {formattedDate}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={() => setEditDialogOpen(true)}>
                <Pencil className="h-4 w-4" />
                <span className="sr-only">Edit</span>
              </Button>
              <Button variant="destructive" size="icon" onClick={handleDelete} disabled={deleting}>
                <Trash2 className="h-4 w-4" />
                <span className="sr-only">Delete</span>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            <div className="flex items-center gap-2">
              <Clock className="text-muted-foreground h-4 w-4" />
              <div>
                <p className="text-muted-foreground text-sm">Duration</p>
                <p className="font-medium">{workout.durationMinutes} min</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-orange-500" />
              <div>
                <p className="text-muted-foreground text-sm">Calories</p>
                <p className="font-medium">{workout.caloriesBurned} kcal</p>
              </div>
            </div>
            {workout.distanceKm && parseFloat(workout.distanceKm) > 0 && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-blue-500" />
                <div>
                  <p className="text-muted-foreground text-sm">Distance</p>
                  <p className="font-medium">{parseFloat(workout.distanceKm).toFixed(1)} km</p>
                </div>
              </div>
            )}
          </div>

          {workout.notes && (
            <div className="border-t pt-4">
              <p className="text-muted-foreground mb-1 text-sm">Notes</p>
              <p className="text-sm whitespace-pre-wrap">{workout.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Workout</DialogTitle>
          </DialogHeader>
          <WorkoutForm
            userWeightKg={userWeightKg}
            initialData={workout}
            onSuccess={() => {
              setEditDialogOpen(false);
              fetchWorkout();
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
