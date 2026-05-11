import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { userProfile } from "@/lib/schema";
import { parseJsonBody, profileUpsertSchema } from "@/lib/validators/fitness";

export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [profile] = await db
      .select()
      .from(userProfile)
      .where(eq(userProfile.userId, session.user.id))
      .limit(1);

    if (!profile) {
      return Response.json(null);
    }

    return Response.json(profile);
  } catch (error) {
    console.error("Error fetching profile:", error);
    return Response.json({ error: "Failed to fetch profile" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await parseJsonBody(req, profileUpsertSchema);
    if (!body.ok) return body.response;
    const { height, weight, age, activityLevel, dailyStepGoal, dailyCalorieGoal, preferredUnits } =
      body.data;

    // Build update set, always include updatedAt to guarantee non-empty set
    const updateSet: Record<string, unknown> = { updatedAt: new Date() };
    if (height !== undefined) updateSet.height = height != null ? height.toString() : null;
    if (weight !== undefined) updateSet.weight = weight != null ? weight.toString() : null;
    if (age !== undefined) updateSet.age = age;
    if (activityLevel !== undefined) updateSet.activityLevel = activityLevel;
    if (dailyStepGoal !== undefined) updateSet.dailyStepGoal = dailyStepGoal;
    if (dailyCalorieGoal !== undefined) updateSet.dailyCalorieGoal = dailyCalorieGoal;
    if (preferredUnits !== undefined) updateSet.preferredUnits = preferredUnits;

    // Upsert using ON CONFLICT on the unique userId column
    const [result] = await db
      .insert(userProfile)
      .values({
        userId: session.user.id,
        height: height != null ? height.toString() : undefined,
        weight: weight != null ? weight.toString() : undefined,
        age: age ?? undefined,
        activityLevel: activityLevel ?? "moderate",
        dailyStepGoal: dailyStepGoal ?? 10000,
        dailyCalorieGoal: dailyCalorieGoal ?? 2000,
        preferredUnits: preferredUnits ?? "metric",
      })
      .onConflictDoUpdate({
        target: userProfile.userId,
        set: updateSet,
      })
      .returning();

    return Response.json(result);
  } catch (error) {
    console.error("Error saving profile:", error);
    return Response.json({ error: "Failed to save profile" }, { status: 500 });
  }
}
