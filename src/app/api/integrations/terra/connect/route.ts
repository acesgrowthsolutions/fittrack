import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { generateWidgetSession, getTerraConfig } from "@/lib/terra";

// Default providers offered in the Terra widget. Apple Health + Google Fit
// cover the two phone OS step counters; the rest are listed so users with
// wearables can pick one without us re-deploying.
const DEFAULT_PROVIDERS = ["APPLE", "GOOGLE", "FITBIT", "GARMIN", "OURA", "WHOOP"];

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const config = getTerraConfig();
    if (!config) {
      return Response.json(
        { error: "Terra integration is not configured" },
        { status: 503 }
      );
    }

    // Build redirect URLs from the request origin so this works on preview
    // deployments and localhost without per-env config. Falls back to
    // NEXT_PUBLIC_APP_URL if the request URL isn't parseable for any reason.
    let origin: string;
    try {
      origin = new URL(req.url).origin;
    } catch {
      origin = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    }

    const result = await generateWidgetSession({
      config,
      referenceId: session.user.id,
      providers: DEFAULT_PROVIDERS,
      authSuccessRedirectUrl: `${origin}/dashboard?health=connected`,
      authFailureRedirectUrl: `${origin}/dashboard?health=failed`,
    });

    return Response.json({ url: result.url, expiresIn: result.expiresIn });
  } catch (error) {
    console.error("Terra connect failed:", error);
    return Response.json({ error: "Failed to start health connection" }, { status: 500 });
  }
}
