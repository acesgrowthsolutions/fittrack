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
            <div className="bg-muted relative h-24 w-24 shrink-0 overflow-hidden rounded-md sm:h-32 sm:w-32">
              <Image
                src={meal.imageUrl}
                alt={meal.description}
                fill
                sizes="128px"
                className="object-cover"
              />
            </div>
          )}
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className={MEAL_TYPE_COLORS[meal.mealType] ?? ""}>
                    {meal.mealType}
                  </Badge>
                  {meal.confidence && (
                    <span className="text-muted-foreground text-xs">
                      {meal.confidence} confidence
                    </span>
                  )}
                </div>
                <p className="text-sm leading-snug font-medium">{meal.description}</p>
              </div>
              <div className="flex shrink-0 items-start gap-2">
                <div className="text-right">
                  <div className="text-xl font-bold">{meal.totalCalories}</div>
                  <div className="text-muted-foreground text-xs">kcal</div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(meal.id)}
                  aria-label="Delete meal"
                >
                  <Trash2 className="text-muted-foreground h-4 w-4" />
                </Button>
              </div>
            </div>

            {(meal.proteinG || meal.carbsG || meal.fatG) && (
              <div className="text-muted-foreground flex gap-3 text-xs">
                {meal.proteinG && <span>P {meal.proteinG}g</span>}
                {meal.carbsG && <span>C {meal.carbsG}g</span>}
                {meal.fatG && <span>F {meal.fatG}g</span>}
              </div>
            )}

            {meal.foodItems.length > 0 && (
              <details className="text-muted-foreground text-xs">
                <summary className="hover:text-foreground cursor-pointer">
                  {meal.foodItems.length} item
                  {meal.foodItems.length === 1 ? "" : "s"}
                </summary>
                <ul className="mt-2 space-y-1 pl-1">
                  {meal.foodItems.map((item, i) => (
                    <li key={i} className="flex justify-between gap-2">
                      <span>
                        {item.name} <span className="opacity-70">({item.portion})</span>
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
