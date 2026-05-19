"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { WorkoutForm } from "@/components/fitness/workout-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// Floating action button + log-workout dialog. Lives in its own client island
// so the surrounding dashboard can stay a Server Component — only this small
// piece needs hydration for the open/close state and the form interactivity.
//
// On successful save we call router.refresh() to re-fetch the server-rendered
// dashboard data (rings, recent workouts, weekly chart) instead of running
// a parallel REST refetch on the client.

interface DashboardFabProps {
  userWeightKg: number | null;
}

export function DashboardFab({ userWeightKg }: DashboardFabProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="fixed right-6 bottom-6 z-40 h-14 w-14 rounded-full shadow-lg">
          <Plus className="h-6 w-6" />
          <span className="sr-only">Log Workout</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log Workout</DialogTitle>
        </DialogHeader>
        <WorkoutForm
          userWeightKg={userWeightKg}
          onSuccess={() => {
            setOpen(false);
            router.refresh();
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
