import { headers } from "next/headers";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { streamText, UIMessage, convertToModelMessages } from "ai";
import { and, desc, eq, gte } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { dailyStats, goals, userProfile, workouts } from "@/lib/schema";

// Zod schema for message validation
const messagePartSchema = z.object({
  type: z.string(),
  text: z.string().max(10000, "Message text too long").optional(),
});

const messageSchema = z.object({
  id: z.string().optional(),
  role: z.enum(["user", "assistant", "system"]),
  parts: z.array(messagePartSchema).optional(),
  content: z.union([z.string(), z.array(messagePartSchema)]).optional(),
});

const chatRequestSchema = z.object({
  messages: z.array(messageSchema).max(100, "Too many messages"),
});

function getDateStr(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split("T")[0] as string;
}

async function buildUserContext(userId: string): Promise<string> {
  const weekAgo = getDateStr(7);

  const [profileResult, recentStats, recentWorkouts, activeGoals] =
    await Promise.all([
      db
        .select()
        .from(userProfile)
        .where(eq(userProfile.userId, userId))
        .limit(1),
      db
        .select()
        .from(dailyStats)
        .where(
          and(eq(dailyStats.userId, userId), gte(dailyStats.date, weekAgo))
        )
        .orderBy(desc(dailyStats.date)),
      db
        .select()
        .from(workouts)
        .where(eq(workouts.userId, userId))
        .orderBy(desc(workouts.workoutDate), desc(workouts.createdAt))
        .limit(5),
      db
        .select()
        .from(goals)
        .where(and(eq(goals.userId, userId), eq(goals.completed, false)))
        .orderBy(desc(goals.createdAt)),
    ]);

  const profile = profileResult[0];
  const units = profile?.preferredUnits ?? "metric";
  const distanceUnit = units === "imperial" ? "mi" : "km";
  const heightUnit = units === "imperial" ? "in" : "cm";
  const weightUnit = units === "imperial" ? "lb" : "kg";

  const lines: string[] = ["## User context (use this to personalize advice)"];

  if (profile) {
    const profileBits: string[] = [];
    if (profile.age != null) profileBits.push(`age ${profile.age}`);
    if (profile.height) profileBits.push(`height ${profile.height}${heightUnit}`);
    if (profile.weight) profileBits.push(`weight ${profile.weight}${weightUnit}`);
    if (profile.activityLevel)
      profileBits.push(`activity level: ${profile.activityLevel}`);
    if (profile.dailyStepGoal)
      profileBits.push(`daily step goal: ${profile.dailyStepGoal}`);
    if (profile.dailyCalorieGoal)
      profileBits.push(`daily calorie goal: ${profile.dailyCalorieGoal}`);
    profileBits.push(`units: ${units}`);
    lines.push(`Profile: ${profileBits.join(", ")}.`);
  } else {
    lines.push(
      "Profile: not set up yet. Encourage the user to complete their profile for better guidance."
    );
  }

  if (recentStats.length > 0) {
    const totalSteps = recentStats.reduce((sum, s) => sum + (s.steps ?? 0), 0);
    const totalCalories = recentStats.reduce(
      (sum, s) => sum + (s.caloriesBurned ?? 0),
      0
    );
    const totalActiveMin = recentStats.reduce(
      (sum, s) => sum + (s.activeMinutes ?? 0),
      0
    );
    const avgSteps = Math.round(totalSteps / recentStats.length);
    lines.push(
      `Last 7 days: ${totalSteps} steps total (avg ${avgSteps}/day), ${totalCalories} kcal burned, ${totalActiveMin} active minutes across ${recentStats.length} logged day(s).`
    );
    const today = recentStats[0];
    if (today) {
      lines.push(
        `Most recent log (${today.date}): ${today.steps} steps, ${today.caloriesBurned} kcal, ${today.activeMinutes} active min.`
      );
    }
  } else {
    lines.push("Last 7 days: no daily activity logged.");
  }

  if (recentWorkouts.length > 0) {
    lines.push("Recent workouts:");
    for (const w of recentWorkouts) {
      const distance = w.distanceKm ? `, ${w.distanceKm}${distanceUnit}` : "";
      lines.push(
        `- ${w.workoutDate} • ${w.type} • ${w.name} • ${w.durationMinutes} min • ${w.caloriesBurned} kcal${distance}`
      );
    }
  } else {
    lines.push("Recent workouts: none logged.");
  }

  if (activeGoals.length > 0) {
    lines.push("Active goals:");
    for (const g of activeGoals) {
      const target = parseFloat(g.targetValue);
      const current = parseFloat(g.currentValue);
      const pct =
        target > 0 ? Math.min(Math.round((current / target) * 100), 100) : 0;
      const deadline = g.endDate ? ` by ${g.endDate}` : "";
      lines.push(
        `- ${g.type}: ${current}/${target} ${g.unit} (${pct}%)${deadline}`
      );
    }
  } else {
    lines.push("Active goals: none set.");
  }

  return lines.join("\n");
}

export async function POST(req: Request) {
  // Verify user is authenticated
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Parse and validate request body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const parsed = chatRequestSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(
      JSON.stringify({
        error: "Invalid request",
        details: z.flattenError(parsed.error).fieldErrors,
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const { messages }: { messages: UIMessage[] } = parsed.data as { messages: UIMessage[] };

  // Initialize OpenRouter with API key from environment
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "OpenRouter API key not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const openrouter = createOpenRouter({ apiKey });

  let userContext = "";
  try {
    userContext = await buildUserContext(session.user.id);
  } catch (err) {
    console.error("Failed to build user context for chat:", err);
  }

  const baseSystem =
    "You are FitTrack AI, a personal fitness coach for " +
    `${session.user.name}. Help with workout plans, nutrition advice, exercise ` +
    "form tips, recovery strategies, and motivation based on their fitness " +
    "goals and recent activity. Be encouraging, evidence-based, and practical. " +
    "Reference the user's profile, recent workouts, daily stats, and active " +
    "goals shown below whenever it makes the advice more specific — but don't " +
    "recite the data back; weave it in naturally. When suggesting workout " +
    "plans, include sets, reps, and rest times. When discussing nutrition, " +
    "provide specific macronutrient guidance. Always remind users to consult a " +
    "healthcare professional before starting new exercise programs.";

  const system = userContext ? `${baseSystem}\n\n${userContext}` : baseSystem;

  const result = streamText({
    model: openrouter(process.env.OPENROUTER_MODEL || "openai/gpt-5-mini"),
    system,
    messages: convertToModelMessages(messages),
    maxOutputTokens: 4096,
  });

  return result.toUIMessageStreamResponse();
}
