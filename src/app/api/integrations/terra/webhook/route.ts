/**
 * Terra webhook receiver.
 *
 * Inbound payloads we handle:
 *   - `auth`              → upsert health_integration row, link Terra user_id
 *   - `deauth` / `access_revoked` → mark integration as disconnected
 *   - `daily`             → overwrite daily_stats for each day in the payload
 *
 * Everything else is acknowledged with 200 so Terra doesn't retry forever,
 * but logged for visibility. The endpoint is public; security comes entirely
 * from HMAC signature verification — see `verifyTerraSignature`.
 */

import { and, eq, sql } from "drizzle-orm";
import { checkAchievements } from "@/lib/achievements";
import { db } from "@/lib/db";
import { dailyStats, healthIntegration } from "@/lib/schema";
import {
  getTerraConfig,
  mapDailyEntry,
  verifyTerraSignature,
  type TerraDailyEntry,
  type TerraWebhookEvent,
} from "@/lib/terra";

const PROVIDER = "terra";

async function handleAuth(event: Extract<TerraWebhookEvent, { type: string }>) {
  const user = event.user;
  if (!user?.user_id || !user?.reference_id) {
    return { ok: false as const, reason: "auth event missing user_id or reference_id" };
  }
  const referenceId = String(user.reference_id);
  const externalUserId = String(user.user_id);
  const source = user.provider ? String(user.provider) : null;

  await db
    .insert(healthIntegration)
    .values({
      userId: referenceId,
      provider: PROVIDER,
      externalUserId,
      source,
      status: "active",
      connectedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [healthIntegration.userId, healthIntegration.provider],
      set: {
        externalUserId,
        source,
        status: "active",
        connectedAt: new Date(),
        updatedAt: new Date(),
      },
    });
  return { ok: true as const };
}

async function handleDeauth(event: Extract<TerraWebhookEvent, { type: string }>) {
  const externalUserId = event.user?.user_id;
  if (!externalUserId) return { ok: false as const, reason: "deauth event missing user_id" };
  await db
    .update(healthIntegration)
    .set({ status: "disconnected", updatedAt: new Date() })
    .where(
      and(
        eq(healthIntegration.provider, PROVIDER),
        eq(healthIntegration.externalUserId, String(externalUserId))
      )
    );
  return { ok: true as const };
}

async function handleDaily(event: Extract<TerraWebhookEvent, { type: string }>) {
  const externalUserId = event.user?.user_id;
  if (!externalUserId) return { ok: false as const, reason: "daily event missing user_id" };

  // Look up the integration so we know which app user this belongs to. We
  // only honor active rows — if the user disconnected mid-flight, drop late
  // payloads on the floor.
  const [integration] = await db
    .select({ userId: healthIntegration.userId })
    .from(healthIntegration)
    .where(
      and(
        eq(healthIntegration.provider, PROVIDER),
        eq(healthIntegration.externalUserId, String(externalUserId)),
        eq(healthIntegration.status, "active")
      )
    )
    .limit(1);

  if (!integration) {
    return { ok: false as const, reason: "no active integration for terra user" };
  }

  const entries = Array.isArray((event as { data?: unknown }).data)
    ? ((event as { data?: TerraDailyEntry[] }).data ?? [])
    : [];

  // Map every entry first, then issue a single multi-row upsert. Previously
  // we awaited one INSERT per entry inside the loop — a Terra daily payload
  // commonly carries a week+ of dates, and the webhook is retried (often
  // multiple times) by Terra if the response is slow, so the sequential
  // N round-trips were a real source of timeout-triggered retry storms.
  // OVERWRITE semantics: Terra daily payloads are end-of-day totals, not
  // deltas. `excluded.<col>` references the would-be-inserted row's value,
  // so each conflicting row updates to whatever the latest payload said.
  // Manual entries via /add-steps for the same day get clobbered — the UI
  // hides the in-app step tracker when an integration is active so users
  // don't double-log.
  const rows = entries
    .map(mapDailyEntry)
    .filter((m): m is NonNullable<ReturnType<typeof mapDailyEntry>> => m !== null)
    .map((mapped) => ({ userId: integration.userId, ...mapped }));

  if (rows.length > 0) {
    await db
      .insert(dailyStats)
      .values(rows)
      .onConflictDoUpdate({
        target: [dailyStats.userId, dailyStats.date],
        set: {
          steps: sql`excluded.steps`,
          distanceKm: sql`excluded.distance_km`,
          caloriesBurned: sql`excluded.calories_burned`,
          activeMinutes: sql`excluded.active_minutes`,
          updatedAt: new Date(),
        },
      });
  }
  const writtenDays = rows.length;

  if (writtenDays > 0) {
    await db
      .update(healthIntegration)
      .set({ lastSyncAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(healthIntegration.provider, PROVIDER),
          eq(healthIntegration.externalUserId, String(externalUserId))
        )
      );

    // Step-count badges (10k_steps, step_master) can newly qualify after a
    // Terra sync — every other mutation path already runs this. We await
    // rather than fire-and-forget because the function may be torn down by
    // the runtime as soon as we return 200, and a detached promise would
    // be lost. Failure is non-fatal: log it and still ack the webhook.
    try {
      await checkAchievements(integration.userId);
    } catch (err) {
      console.error("Achievement check after Terra daily sync failed:", err);
    }
  }

  return { ok: true as const, writtenDays };
}

export async function POST(req: Request) {
  const config = getTerraConfig();
  if (!config) {
    // 503 Service Unavailable signals "not configured yet" without giving
    // away whether the endpoint exists. Terra will retry; once env vars are
    // set the next delivery succeeds.
    return new Response("Terra not configured", { status: 503 });
  }

  // Read the raw body BEFORE parsing — the HMAC is over the exact bytes
  // Terra signed, and re-serialized JSON won't byte-match.
  const rawBody = await req.text();
  const verifyResult = verifyTerraSignature(
    req.headers.get("terra-signature"),
    rawBody,
    config.webhookSecret
  );
  if (!verifyResult.ok) {
    console.warn("Terra webhook signature rejected:", verifyResult.reason);
    return new Response("Invalid signature", { status: 401 });
  }

  let event: TerraWebhookEvent;
  try {
    event = JSON.parse(rawBody) as TerraWebhookEvent;
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  try {
    switch (event.type) {
      case "auth":
        await handleAuth(event);
        break;
      case "deauth":
      case "access_revoked":
        await handleDeauth(event);
        break;
      case "daily":
        await handleDaily(event);
        break;
      default:
        // Unknown / unhandled event types ack with 200 so Terra stops
        // retrying. We're not subscribed to them today but may be later.
        break;
    }
    return new Response("ok", { status: 200 });
  } catch (error) {
    console.error("Terra webhook handler failed:", error);
    // 500 makes Terra retry the delivery, which is what we want for
    // transient DB failures.
    return new Response("Internal error", { status: 500 });
  }
}
