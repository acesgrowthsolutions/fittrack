import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getLifetimeStats } from "@/lib/fitness/get-lifetime";

/**
 * Thin wrapper around the shared getLifetimeStats helper in
 * lib/fitness/get-lifetime. The dashboard Server Component calls the helper
 * directly; this route stays available for any other consumers.
 */
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const stats = await getLifetimeStats(session.user.id);

    // Lifetime stats only change when the user logs a workout/steps entry/meal
    // — at most a handful of times per day. Browser-cache the per-user
    // response for 5 minutes (private = don't share across users) and serve
    // stale for another 5 while a fresh copy is revalidated in the background.
    return Response.json(stats, {
      headers: {
        "Cache-Control": "private, max-age=300, stale-while-revalidate=300",
      },
    });
  } catch (error) {
    console.error("Error fetching lifetime stats:", error);
    return Response.json({ error: "Failed to fetch lifetime stats" }, { status: 500 });
  }
}
