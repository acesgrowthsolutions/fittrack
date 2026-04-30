"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CalorieChartProps {
  data: { date: string; caloriesBurned: number }[];
}

function formatDay(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short" });
}

export function CalorieChart({ data }: CalorieChartProps) {
  const chartData = data.map((d) => ({
    day: formatDay(d.date),
    calories: d.caloriesBurned,
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">
          Calories Burned (7 Days)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
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
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  color: "hsl(var(--foreground))",
                }}
                formatter={(value) => [Number(value).toLocaleString(), "kcal"]}
              />
              <Line
                type="monotone"
                dataKey="calories"
                stroke="hsl(25 95% 53%)"
                strokeWidth={2}
                dot={{ fill: "hsl(25 95% 53%)", strokeWidth: 0, r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
