"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Apple, Camera, Loader2, Upload, Utensils } from "lucide-react";
import { toast } from "sonner";
import { UserProfile } from "@/components/auth/user-profile";
import { MealCard, type Meal } from "@/components/fitness/meal-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useSession } from "@/lib/auth-client";
import { addDays } from "@/lib/date-tz";
import { getLocalDateStr } from "@/lib/local-date";

const MEAL_TYPES = [
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
  { value: "snack", label: "Snack" },
] as const;

const ALL_PAGE_SIZE = 20;

function formatDateLabel(dateStr: string): string {
  const today = getLocalDateStr();
  if (dateStr === today) return "Today";
  if (dateStr === addDays(today, -1)) return "Yesterday";
  // Both today and dateStr are user-local YYYY-MM-DD, so parsing as UTC and
  // formatting in UTC gives the correct weekday/date label without any tz
  // shift (both anchors are in the same coordinate system).
  const [y, m, d] = dateStr.split("-").map(Number) as [number, number, number];
  const ms = Date.UTC(y, m - 1, d);
  const dt = new Date(ms);
  const opts: Intl.DateTimeFormatOptions = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  };
  return new Intl.DateTimeFormat(undefined, opts).format(dt);
}

export default function MealsPage() {
  const { data: session, isPending } = useSession();

  // Day view state
  const [dayMeals, setDayMeals] = useState<Meal[]>([]);
  const [dayLoading, setDayLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(getLocalDateStr());
  const [calorieGoal, setCalorieGoal] = useState<number | null>(null);

  // All-history view state
  const [allMeals, setAllMeals] = useState<Meal[]>([]);
  const [allLoading, setAllLoading] = useState(false);
  const [allLoadingMore, setAllLoadingMore] = useState(false);
  const [allOffset, setAllOffset] = useState(0);
  const [allHasMore, setAllHasMore] = useState(true);
  const [allLoaded, setAllLoaded] = useState(false);

  // Upload state
  const [analyzing, setAnalyzing] = useState(false);
  const [mealType, setMealType] = useState<(typeof MEAL_TYPES)[number]["value"]>("lunch");
  const [note, setNote] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<"day" | "all">("day");

  const fetchDayMeals = useCallback(async (date: string) => {
    try {
      setDayLoading(true);
      const res = await fetch(`/api/meals?date=${date}`);
      if (!res.ok) throw new Error("Failed to fetch meals");
      const data: Meal[] = await res.json();
      setDayMeals(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load meals");
    } finally {
      setDayLoading(false);
    }
  }, []);

  const fetchAllMeals = useCallback(async (offset = 0, append = false) => {
    try {
      if (offset === 0) setAllLoading(true);
      else setAllLoadingMore(true);
      const res = await fetch(`/api/meals?limit=${ALL_PAGE_SIZE}&offset=${offset}`);
      if (!res.ok) throw new Error("Failed to fetch meals");
      const data: Meal[] = await res.json();
      setAllMeals((prev) => (append ? [...prev, ...data] : data));
      setAllHasMore(data.length === ALL_PAGE_SIZE);
      setAllOffset(offset + data.length);
      setAllLoaded(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load meals");
    } finally {
      setAllLoading(false);
      setAllLoadingMore(false);
    }
  }, []);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch("/api/fitness/profile");
      if (!res.ok) return;
      const profile = await res.json();
      if (profile?.dailyCalorieGoal) {
        setCalorieGoal(profile.dailyCalorieGoal);
      }
    } catch {
      // best-effort
    }
  }, []);

  useEffect(() => {
    if (session) {
      fetchDayMeals(selectedDate);
      fetchProfile();
    }
  }, [session, selectedDate, fetchDayMeals, fetchProfile]);

  // Lazy-load all-history on first tab activation
  useEffect(() => {
    if (session && activeTab === "all" && !allLoaded) {
      fetchAllMeals(0);
    }
  }, [session, activeTab, allLoaded, fetchAllMeals]);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Image must be under 8MB");
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
    setPendingFile(file);
  }

  function clearPending() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPendingFile(null);
    setNote("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  }

  function refreshAll() {
    fetchDayMeals(selectedDate);
    if (allLoaded) {
      // Refetch from offset 0 so the all-history view stays in sync.
      setAllLoaded(false);
      setAllOffset(0);
      fetchAllMeals(0);
    }
  }

  async function analyze() {
    if (!pendingFile) return;
    setAnalyzing(true);
    try {
      const fd = new FormData();
      fd.append("image", pendingFile);
      fd.append("mealType", mealType);
      fd.append("mealDate", selectedDate);
      if (note.trim()) fd.append("note", note.trim());

      const res = await fetch("/api/meals/analyze", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = data.error || "Analysis failed";
        const detail = data.detail ? ` — ${String(data.detail).slice(0, 200)}` : "";
        throw new Error(msg + detail);
      }
      toast.success(`Logged ${data.totalCalories} kcal`);
      clearPending();
      refreshAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Analysis failed", {
        duration: 8000,
      });
    } finally {
      setAnalyzing(false);
    }
  }

  async function deleteMeal(id: string) {
    if (!confirm("Delete this meal?")) return;
    try {
      const res = await fetch(`/api/meals/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete");
      }
      setDayMeals((prev) => prev.filter((m) => m.id !== id));
      setAllMeals((prev) => prev.filter((m) => m.id !== id));
      toast.success("Meal deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    }
  }

  // Group all-history meals by date for the All tab
  const allMealsByDate = useMemo(() => {
    const groups = new Map<string, Meal[]>();
    for (const m of allMeals) {
      const list = groups.get(m.mealDate) ?? [];
      list.push(m);
      groups.set(m.mealDate, list);
    }
    return Array.from(groups.entries()); // already date-desc from API
  }, [allMeals]);

  const totalAllCalories = useMemo(
    () => allMeals.reduce((s, m) => s + m.totalCalories, 0),
    [allMeals]
  );

  if (isPending) {
    return (
      <div className="container mx-auto p-6">
        <Skeleton className="mb-6 h-8 w-48" />
        <Skeleton className="mb-6 h-64" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <p className="text-muted-foreground mb-4">Sign in to log your meals</p>
        <UserProfile />
      </div>
    );
  }

  const dayCalories = dayMeals.reduce((sum, m) => sum + m.totalCalories, 0);
  const goalPct =
    calorieGoal && calorieGoal > 0
      ? Math.min(Math.round((dayCalories / calorieGoal) * 100), 100)
      : null;

  return (
    <div className="container mx-auto max-w-5xl space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Utensils className="text-primary h-6 w-6" />
            Meals
          </h1>
          <p className="text-muted-foreground">Snap a photo and let AI estimate the calories</p>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="meal-date" className="text-muted-foreground text-sm">
            Date
          </Label>
          <Input
            id="meal-date"
            type="date"
            value={selectedDate}
            max={getLocalDateStr()}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-44"
          />
        </div>
      </div>

      {/* Upload card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Log a meal</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!pendingFile ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Button
                variant="outline"
                className="h-32 flex-col gap-2"
                onClick={() => cameraInputRef.current?.click()}
              >
                <Camera className="h-8 w-8" />
                <span>Take photo</span>
              </Button>
              <Button
                variant="outline"
                className="h-32 flex-col gap-2"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-8 w-8" />
                <span>Upload image</span>
              </Button>
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFileSelect}
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>
          ) : (
            <div className="space-y-4">
              {previewUrl && (
                <div className="bg-muted relative h-64 w-full overflow-hidden rounded-md sm:h-80">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewUrl}
                    alt="Meal preview"
                    className="h-full w-full object-contain"
                  />
                </div>
              )}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Meal type</Label>
                  <Select value={mealType} onValueChange={(v) => setMealType(v as typeof mealType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MEAL_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={selectedDate}
                    max={getLocalDateStr()}
                    onChange={(e) => setSelectedDate(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="note">Note (optional)</Label>
                <Textarea
                  id="note"
                  placeholder="e.g. cooked in olive oil, large portion, side salad with ranch"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={500}
                  rows={2}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={analyze} disabled={analyzing} className="flex-1">
                  {analyzing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Analyzing…
                    </>
                  ) : (
                    <>
                      <Apple className="h-4 w-4" />
                      Analyze & save
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={clearPending} disabled={analyzing}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs: Day vs All history */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "day" | "all")}>
        <TabsList>
          <TabsTrigger value="day">Day</TabsTrigger>
          <TabsTrigger value="all">All meals</TabsTrigger>
        </TabsList>

        <TabsContent value="day" className="space-y-4 pt-2">
          {/* Daily summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium">
                {selectedDate === getLocalDateStr() ? "Today" : selectedDate}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-3xl font-bold">{dayCalories}</span>
                <span className="text-muted-foreground text-sm">
                  {calorieGoal ? `of ${calorieGoal} kcal goal` : "kcal consumed"}
                </span>
              </div>
              {goalPct !== null && <Progress value={goalPct} />}
              <p className="text-muted-foreground text-xs">
                {dayMeals.length} meal{dayMeals.length === 1 ? "" : "s"} logged
              </p>
            </CardContent>
          </Card>

          {/* Day meal list */}
          <div className="space-y-3">
            {dayLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-32" />
                ))}
              </div>
            ) : dayMeals.length === 0 ? (
              <Card>
                <CardContent className="text-muted-foreground py-12 text-center">
                  No meals logged for this day yet.
                </CardContent>
              </Card>
            ) : (
              dayMeals.map((meal) => <MealCard key={meal.id} meal={meal} onDelete={deleteMeal} />)
            )}
          </div>
        </TabsContent>

        <TabsContent value="all" className="space-y-4 pt-2">
          {/* All-history summary */}
          {allLoaded && allMeals.length > 0 && (
            <Card>
              <CardContent className="flex items-baseline justify-between py-4">
                <div>
                  <p className="text-muted-foreground text-sm">
                    {allMeals.length} meal{allMeals.length === 1 ? "" : "s"}
                    {allHasMore ? "+ shown" : " total"}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold">{totalAllCalories}</span>{" "}
                  <span className="text-muted-foreground text-sm">kcal</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* All-history grouped list */}
          {allLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          ) : allMeals.length === 0 ? (
            <Card>
              <CardContent className="text-muted-foreground py-12 text-center">
                You haven&apos;t logged any meals yet.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {allMealsByDate.map(([date, items]) => {
                const dayKcal = items.reduce((s, m) => s + m.totalCalories, 0);
                return (
                  <section key={date} className="space-y-2">
                    <div className="flex items-baseline justify-between">
                      <h3 className="text-muted-foreground text-sm font-semibold">
                        {formatDateLabel(date)}
                      </h3>
                      <span className="text-muted-foreground text-xs">
                        {items.length} meal{items.length === 1 ? "" : "s"} · {dayKcal} kcal
                      </span>
                    </div>
                    <div className="space-y-3">
                      {items.map((meal) => (
                        <MealCard key={meal.id} meal={meal} onDelete={deleteMeal} />
                      ))}
                    </div>
                  </section>
                );
              })}

              {allHasMore && (
                <div className="flex justify-center pt-2">
                  <Button
                    variant="outline"
                    onClick={() => fetchAllMeals(allOffset, true)}
                    disabled={allLoadingMore}
                  >
                    {allLoadingMore ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading…
                      </>
                    ) : (
                      "Load more"
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
