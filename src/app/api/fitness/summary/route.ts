import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getSummary } from "@/lib/fitness/get-summary";
import { getUserTz } from "@/lib/user-tz";

/**
 * Thin wrapper around the shared getSummary helper in
 * lib/fitness/get-summary. The dashboard Server Component calls the helper
 * directly to avoid an HTTP self-fetch — this route is kept for any other
 * consumers (mobile app, scripts, future widgets) and as a stable JSON
 * contract.
 */
export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const summary = await getSummary(session.user.id, await getUserTz());
    return Response.json(summary);
  } catch (error) {
    console.error("Error fetching summary:", error);
    return Response.json({ error: "Failed to fetch summary" }, { status: 500 });
  }
}
