"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface WeeklyChartProps {
  data: { date: string; steps: number }[];
}

/**
 * Formats a date string (YYYY-MM-DD) to a short weekday label like "Mon".
 */
function formatDay(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00"); // Use noon to avoid timezone shifts
  return d.toLocaleDateString("en-US", { weekday: "short" });
}

export function WeeklyChart({ data }: WeeklyChartProps) {
  const chartData = data.map((d) => ({
    day: formatDay(d.date),
    steps: d.steps,
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">
          Weekly Steps
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid
                strokeDasharray="3 3"
                className="stroke-border"
                vertical={false}
              />
              <XAxis
                dataKey="day"
                className="text-xs"
                tick={{ fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                className="text-xs"
                tick={{ fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val: number) =>
                  val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val.toString()
                }
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  color: "hsl(var(--foreground))",
                }}
                formatter={(value) => [
                  Number(value).toLocaleString(),
                  "Steps",
                ]}
              />
              <Bar
                dataKey="steps"
                fill="hsl(210 100% 60%)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
