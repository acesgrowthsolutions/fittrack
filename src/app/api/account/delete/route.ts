import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { meals, user } from "@/lib/schema";
import { deleteFile } from "@/lib/storage";

/**
 * GDPR Article 17 (right to erasure). Permanently deletes the signed-in
 * user's account and every row that references them.
 *
 * Safety:
 *   - Caller must submit `email` matching their session email — a typed
 *     confirmation gate keeps an accidental fetch from nuking an account.
 *   - All fitness tables (workouts, daily_stats, goals, meals, achievements,
 *     userProfile, sessions, accounts) cascade on user.id deletion via FK
 *     constraints, so a single DELETE handles the relational cleanup.
 *   - Meal images live outside the database (Vercel Blob or local fs) and
 *     don't cascade — we explicitly enumerate and best-effort delete them
 *     before tearing down the row. Failures here are logged but don't block
 *     the deletion: a leaked image file is recoverable; a half-deleted user
 *     account is not.
 */

const bodySchema = z.object({
  email: z.string().email(),
});

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid body", details: z.flattenError(parsed.error).fieldErrors },
      { status: 400 }
    );
  }

  const userId = session.user.id;

  // Case-insensitive match: BetterAuth stores emails verbatim but users
  // typing in a confirmation box shouldn't be punished for capitalization.
  if (parsed.data.email.toLowerCase() !== session.user.email.toLowerCase()) {
    return Response.json(
      { error: "Email confirmation does not match the signed-in account" },
      { status: 400 }
    );
  }

  // Collect meal image URLs before the cascade wipes the rows. Best-effort:
  // image cleanup failures should not stop account deletion.
  const userMeals = await db
    .select({ imageUrl: meals.imageUrl })
    .from(meals)
    .where(eq(meals.userId, userId));

  const imageUrls = userMeals.map((m) => m.imageUrl).filter((u): u is string => !!u);

  await Promise.allSettled(
    imageUrls.map((url) =>
      deleteFile(url).catch((err) => {
        console.error("Failed to delete meal image during account deletion:", url, err);
      })
    )
  );

  // FK constraints cascade: deleting `user` removes session, account,
  // user_profile, workouts, daily_stats, goals, meals, achievements,
  // rate_limit_event in one shot.
  await db.delete(user).where(eq(user.id, userId));

  return Response.json({ success: true });
}
