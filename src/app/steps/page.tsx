"use client";

import { useState, useEffect, useCallback } from "react";
import { Footprints, Plus } from "lucide-react";
import { toast } from "sonner";
import { UserProfile } from "@/components/auth/user-profile";
import { StepForm } from "@/components/fitness/step-form";
import { WeeklyChart } from "@/components/fitness/weekly-chart";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useSession } from "@/lib/auth-client";

interface DailyStat {
  id?: string;
  date: string;
  steps: number;
  distanceKm: string;
  caloriesBurned: number;
  activeMinutes: number;
}

export default function StepsPage() {
  const { data: session, isPending } = useSession();
  const [todayStats, setTodayStats] = useState<DailyStat | null>(null);
  const [history, setHistory] = useState<DailyStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [stepGoal, setStepGoal] = useState(10000);

  const fetchData = useCallback(async () => {
    try {
      const [todayRes, historyRes, profileRes] = await Promise.all([
        fetch("/api/fitness/daily-stats/today"),
        fetch("/api/fitness/daily-stats?days=30"),
        fetch("/api/fitness/profile"),
      ]);

      if (todayRes.ok) setTodayStats(await todayRes.json());
      if (historyRes.ok) setHistory(await historyRes.json());
      if (profileRes.ok) {
        const profile = await profileRes.json();
        if (profile?.dailyStepGoal) setStepGoal(profile.dailyStepGoal);
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to load step data"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session) fetchData();
  }, [session, fetchData]);

  if (isPending) {
    return (
      <div className="container mx-auto p-6">
        <Skeleton className="h-8 w-48 mb-6" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <p className="text-muted-foreground mb-4">
          Sign in to track your steps
        </p>
        <UserProfile />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48" />
        <Skeleton className="h-72" />
      </div>
    );
  }

  const steps = todayStats?.steps ?? 0;
  const progress = Math.min((steps / stepGoal) * 100, 100);

  // Build weekly chart data from the last 7 days of history
  const weeklyData = buildWeeklyData(history);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Step Tracking</h1>
          <p className="text-muted-foreground">
            Monitor your daily steps and activity
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4" />
              Log Steps
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Log Today&apos;s Steps</DialogTitle>
            </DialogHeader>
            <StepForm
              initialSteps={todayStats?.steps ?? 0}
              initialActiveMinutes={todayStats?.activeMinutes ?? 0}
              initialDistanceKm={todayStats ? parseFloat(todayStats.distanceKm) : 0}
              initialCaloriesBurned={todayStats?.caloriesBurned ?? 0}
              onSuccess={() => {
                setDialogOpen(false);
                fetchData();
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Today's Progress */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col items-center space-y-4">
            <div className="bg-blue-500/10 rounded-full p-4">
              <Footprints className="h-10 w-10 text-blue-500" />
            </div>
            <div className="text-center">
              <p className="text-4xl font-bold">{steps.toLocaleString()}</p>
              <p className="text-muted-foreground">
                of {stepGoal.toLocaleString()} steps today
              </p>
            </div>
            <div className="w-full max-w-md space-y-1">
              <Progress value={progress} className="h-3" />
              <p className="text-sm text-muted-foreground text-center">
                {Math.round(progress)}% of daily goal
              </p>
            </div>
            {todayStats && (
              <div className="grid grid-cols-3 gap-6 pt-2 text-center">
                <div>
                  <p className="text-lg font-semibold">
                    {parseFloat(todayStats.distanceKm).toFixed(1)}
                  </p>
                  <p className="text-xs text-muted-foreground">km</p>
                </div>
                <div>
                  <p className="text-lg font-semibold">
                    {todayStats.caloriesBurned}
                  </p>
                  <p className="text-xs text-muted-foreground">kcal</p>
                </div>
                <div>
                  <p className="text-lg font-semibold">
                    {todayStats.activeMinutes}
                  </p>
                  <p className="text-xs text-muted-foreground">min active</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Weekly Chart */}
      <WeeklyChart data={weeklyData} />

      {/* 30-Day History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            30-Day History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No step data recorded yet. Start logging your steps!
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Steps</TableHead>
                    <TableHead className="text-right">Distance</TableHead>
                    <TableHead className="text-right">Calories</TableHead>
                    <TableHead className="text-right">Active Min</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((stat) => (
                    <TableRow key={stat.date}>
                      <TableCell>
                        {new Date(stat.date + "T12:00:00").toLocaleDateString(
                          "en-US",
                          { month: "short", day: "numeric" }
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {stat.steps.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {parseFloat(stat.distanceKm).toFixed(1)} km
                      </TableCell>
                      <TableCell className="text-right">
                        {stat.caloriesBurned}
                      </TableCell>
                      <TableCell className="text-right">
                        {stat.activeMinutes}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function buildWeeklyData(
  history: DailyStat[]
): Array<{ date: string; steps: number }> {
  const map = new Map(history.map((h) => [h.date, h.steps]));
  const result: Array<{ date: string; steps: number }> = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0] as string;
    result.push({ date: dateStr, steps: map.get(dateStr) ?? 0 });
  }

  return result;
}
