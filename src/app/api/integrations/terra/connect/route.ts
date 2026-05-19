import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { generateWidgetSession, getTerraConfig } from "@/lib/terra";

// Default providers offered in the Terra widget. Apple Health + Google Fit
// cover the two phone OS step counters; the rest are listed so users with
// wearables can pick one without us re-deploying.
const DEFAULT_PROVIDERS = ["APPLE", "GOOGLE", "FITBIT", "GARMIN", "OURA", "WHOOP"];

export async function POST(_req: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const config = getTerraConfig();
    if (!config) {
      return Response.json({ error: "Terra integration is not configured" }, { status: 503 });
    }

    // Pick a trusted origin for the post-auth redirect that the user lands on
    // when coming back from Terra. The previous implementation derived this
    // from `new URL(req.url).origin`, which on Vercel reflects whichever Host
    // header reached the function — an attacker could swap that for an
    // arbitrary host via header injection and turn the success/failure URLs
    // into an open redirect.
    //
    // Resolution order, all values are set by the platform or by config
    // (never by request headers):
    //   1. VERCEL_PROJECT_PRODUCTION_URL — the canonical prod URL of this
    //      project. Same value across every deployment, including previews,
    //      so users sent through Terra come back to prod regardless of which
    //      preview they started from. Acceptable trade-off because Terra
    //      callback URLs must be allow-listed in Terra's dashboard anyway,
    //      and trying to allow every preview URL there is impractical.
    //   2. NEXT_PUBLIC_APP_URL — explicit override for self-hosting.
    //   3. localhost — dev only.
    const origin = (() => {
      const prodHost = process.env.VERCEL_PROJECT_PRODUCTION_URL;
      if (prodHost) return `https://${prodHost}`;
      return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    })();

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
