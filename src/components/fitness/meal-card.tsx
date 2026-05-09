"use client";

import Image from "next/image";
import { Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export interface MealFoodItem {
  name: string;
  portion: string;
  calories: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
}

export interface Meal {
  id: string;
  mealType: "breakfast" | "lunch" | "dinner" | "snack";
  mealDate: string;
  description: string;
  totalCalories: number;
  proteinG: string | null;
  carbsG: string | null;
  fatG: string | null;
  foodItems: MealFoodItem[];
  imageUrl: string | null;
  confidence: string | null;
  createdAt: string;
}

const MEAL_TYPE_COLORS: Record<string, string> = {
  breakfast: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  lunch: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  dinner: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
  snack: "bg-pink-500/10 text-pink-600 dark:text-pink-400",
};

interface MealCardProps {
  meal: Meal;
  onDelete: (id: string) => void;
}

export function MealCard({ meal, onDelete }: MealCardProps) {
  return (
    <Card>
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
                  <div className="text-xl font-bold">{meal.totalCalories}</div>
                  <div className="text-xs text-muted-foreground">kcal</div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(meal.id)}
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
                        <span className="opacity-70">({item.portion})</span>
                      </span>
                      <span className="tabular-nums">{item.calories} kcal</span>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
