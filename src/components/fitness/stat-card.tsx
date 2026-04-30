"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  unit?: string;
  icon: LucideIcon;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  /** Tailwind color class for the icon background (e.g. "bg-blue-500/10 text-blue-500") */
  color?: string;
}

export function StatCard({
  title,
  value,
  unit,
  icon: Icon,
  trend,
  trendValue,
  color = "bg-primary/10 text-primary",
}: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold">{value}</span>
              {unit && (
                <span className="text-sm text-muted-foreground">{unit}</span>
              )}
            </div>
            {trend && trendValue && (
              <div className="flex items-center gap-1 text-xs">
                {trend === "up" && (
                  <TrendingUp className="h-3 w-3 text-green-500" />
                )}
                {trend === "down" && (
                  <TrendingDown className="h-3 w-3 text-red-500" />
                )}
                {trend === "neutral" && (
                  <Minus className="h-3 w-3 text-muted-foreground" />
                )}
                <span
                  className={cn(
                    trend === "up" && "text-green-500",
                    trend === "down" && "text-red-500",
                    trend === "neutral" && "text-muted-foreground"
                  )}
                >
                  {trendValue}
                </span>
              </div>
            )}
          </div>
          <div className={cn("rounded-lg p-2", color)}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
