"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  Apple,
  Camera,
  Loader2,
  Trash2,
  Upload,
  Utensils,
} from "lucide-react";
import { toast } from "sonner";
import { UserProfile } from "@/components/auth/user-profile";
import { Badge } from "@/components/ui/badge";
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
import { Textarea } from "@/components/ui/textarea";
import { useSession } from "@/lib/auth-client";
import { getLocalDateStr } from "@/lib/local-date";

interface FoodItem {
  name: string;
  portion: string;
  calories: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
}

interface Meal {
  id: string;
  mealType: "breakfast" | "lunch" | "dinner" | "snack";
  mealDate: string;
  description: string;
  totalCalories: number;
  proteinG: string | null;
  carbsG: string | null;
  fatG: string | null;
  foodItems: FoodItem[];
  imageUrl: string | null;
  confidence: string | null;
  createdAt: string;
}

const MEAL_TYPES = [
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
  { value: "snack", label: "Snack" },
] as const;

const MEAL_TYPE_COLORS: Record<string, string> = {
  breakfast: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  lunch: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  dinner: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
  snack: "bg-pink-500/10 text-pink-600 dark:text-pink-400",
};

export default function MealsPage() {
  const { data: session, isPending } = useSession();
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(getLocalDateStr());
  const [mealType, setMealType] = useState<(typeof MEAL_TYPES)[number]["value"]>(
    "lunch"
  );
  const [note, setNote] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [calorieGoal, setCalorieGoal] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const fetchMeals = useCallback(async (date: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/meals?date=${date}`);
      if (!res.ok) throw new Error("Failed to fetch meals");
      const data: Meal[] = await res.json();
      setMeals(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load meals");
    } finally {
      setLoading(false);
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
      fetchMeals(selectedDate);
      fetchProfile();
    }
  }, [session, selectedDate, fetchMeals, fetchProfile]);

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
      fetchMeals(selectedDate);
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
      setMeals((prev) => prev.filter((m) => m.id !== id));
      toast.success("Meal deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    }
  }

  if (isPending) {
    return (
      <div className="container mx-auto p-6">
        <Skeleton className="h-8 w-48 mb-6" />
        <Skeleton className="h-64 mb-6" />
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

  const totalCalories = meals.reduce((sum, m) => sum + m.totalCalories, 0);
  const goalPct =
    calorieGoal && calorieGoal > 0
      ? Math.min(Math.round((totalCalories / calorieGoal) * 100), 100)
      : null;

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Utensils className="h-6 w-6 text-primary" />
            Meals
          </h1>
          <p className="text-muted-foreground">
            Snap a photo and let AI estimate the calories
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="meal-date" className="text-sm text-muted-foreground">
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

      {/* Daily summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">
            {selectedDate === getLocalDateStr() ? "Today" : selectedDate}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-bold">{totalCalories}</span>
            <span className="text-sm text-muted-foreground">
              {calorieGoal ? `of ${calorieGoal} kcal goal` : "kcal consumed"}
            </span>
          </div>
          {goalPct !== null && <Progress value={goalPct} />}
          <p className="text-xs text-muted-foreground">
            {meals.length} meal{meals.length === 1 ? "" : "s"} logged
          </p>
        </CardContent>
      </Card>

      {/* Upload card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Log a meal</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!pendingFile ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                <div className="relative w-full h-64 sm:h-80 rounded-md overflow-hidden bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewUrl}
                    alt="Meal preview"
                    className="w-full h-full object-contain"
                  />
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Meal type</Label>
                  <Select
                    value={mealType}
                    onValueChange={(v) =>
                      setMealType(v as typeof mealType)
                    }
                  >
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
                <Button
                  variant="outline"
                  onClick={clearPending}
                  disabled={analyzing}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Meal list */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Meals on {selectedDate}</h2>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        ) : meals.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No meals logged for this day yet.
            </CardContent>
          </Card>
        ) : (
          meals.map((meal) => (
            <Card key={meal.id}>
              <CardContent className="p-4">
                <div className="flex gap-4">
                  {meal.imageUrl && (
                    <div className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-md overflow-hidden bg-muted shrink-0">
                      <Image
                        src={meal.imageUrl}
                        alt={meal.description}
                        fill
                        sizes="128px"
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge
                            variant="secondary"
                            className={MEAL_TYPE_COLORS[meal.mealType] ?? ""}
                          >
                            {meal.mealType}
                          </Badge>
                          {meal.confidence && (
                            <span className="text-xs text-muted-foreground">
                              {meal.confidence} confidence
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-medium leading-snug">
                          {meal.description}
                        </p>
                      </div>
                      <div className="flex items-start gap-2 shrink-0">
                        <div className="text-right">
                          <div className="text-xl font-bold">
                            {meal.totalCalories}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            kcal
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteMeal(meal.id)}
                          aria-label="Delete meal"
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </div>
                    </div>

                    {(meal.proteinG || meal.carbsG || meal.fatG) && (
                      <div className="flex gap-3 text-xs text-muted-foreground">
                        {meal.proteinG && <span>P {meal.proteinG}g</span>}
                        {meal.carbsG && <span>C {meal.carbsG}g</span>}
                        {meal.fatG && <span>F {meal.fatG}g</span>}
                      </div>
                    )}

                    {meal.foodItems.length > 0 && (
                      <details className="text-xs text-muted-foreground">
                        <summary className="cursor-pointer hover:text-foreground">
                          {meal.foodItems.length} item
                          {meal.foodItems.length === 1 ? "" : "s"}
                        </summary>
                        <ul className="mt-2 space-y-1 pl-1">
                          {meal.foodItems.map((item, i) => (
                            <li key={i} className="flex justify-between gap-2">
                              <span>
                                {item.name}{" "}
                                <span className="opacity-70">
                                  ({item.portion})
                                </span>
                              </span>
                              <span className="tabular-nums">
                                {item.calories} kcal
                              </span>
                            </li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
