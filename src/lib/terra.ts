/**
 * Terra (tryterra.co) integration — thin wrapper over the v2 REST API plus
 * webhook signature verification.
 *
 * Env vars (set in Vercel + .env):
 *   TERRA_DEV_ID          — public-ish "dev-id" header
 *   TERRA_API_KEY         — secret "x-api-key" header for outbound calls
 *   TERRA_WEBHOOK_SECRET  — secret used to verify inbound webhook signatures
 *
 * All three are required; routes that need Terra should call
 * `requireTerraConfig()` which throws a clear error when any are missing.
 * That way the app boots and runs even before the keys are provisioned, and
 * only the integration endpoints fail.
 */

import { createHmac, timingSafeEqual } from "node:crypto";

const TERRA_API_BASE = "https://api.tryterra.co/v2";

// Older signature versions are not accepted — we only sign-verify the v1
// HMAC format documented at https://docs.tryterra.co/reference/webhook-signatures
const SIGNATURE_VERSION = "v1";

// Reject signatures whose timestamp is older than 5 minutes to make replay
// attacks impractical. Terra recommends 5 minutes.
const SIGNATURE_MAX_SKEW_SECONDS = 5 * 60;

export interface TerraConfig {
  devId: string;
  apiKey: string;
  webhookSecret: string;
}

export function getTerraConfig(): TerraConfig | null {
  const devId = process.env.TERRA_DEV_ID;
  const apiKey = process.env.TERRA_API_KEY;
  const webhookSecret = process.env.TERRA_WEBHOOK_SECRET;
  if (!devId || !apiKey || !webhookSecret) return null;
  return { devId, apiKey, webhookSecret };
}

export function requireTerraConfig(): TerraConfig {
  const cfg = getTerraConfig();
  if (!cfg) {
    throw new Error(
      "Terra is not configured. Set TERRA_DEV_ID, TERRA_API_KEY, and TERRA_WEBHOOK_SECRET."
    );
  }
  return cfg;
}

/**
 * Verifies the `terra-signature` header on an inbound webhook.
 *
 * Header format: `t=<unix_seconds>,v1=<hex_hmac_sha256>`
 * Signed value:  `<timestamp>.<raw_body>`
 *
 * `rawBody` MUST be the exact bytes Terra POSTed — re-serializing the JSON
 * will break the HMAC. Route handlers should read the body as text and pass
 * it through unchanged.
 *
 * Returns `{ ok: true }` on success or `{ ok: false, reason }` on failure.
 * `nowSeconds` is injectable so tests can pin time.
 */
export function verifyTerraSignature(
  header: string | null | undefined,
  rawBody: string,
  secret: string,
  nowSeconds: number = Math.floor(Date.now() / 1000)
): { ok: true } | { ok: false; reason: string } {
  if (!header) return { ok: false, reason: "missing signature header" };

  const parts = header.split(",").map((p) => p.trim());
  let timestamp: string | null = null;
  let signature: string | null = null;
  for (const part of parts) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const key = part.slice(0, eq);
    const value = part.slice(eq + 1);
    if (key === "t") timestamp = value;
    else if (key === SIGNATURE_VERSION) signature = value;
  }
  if (!timestamp || !signature) {
    return { ok: false, reason: "malformed signature header" };
  }

  const ts = Number.parseInt(timestamp, 10);
  if (!Number.isFinite(ts)) {
    return { ok: false, reason: "invalid timestamp" };
  }
  if (Math.abs(nowSeconds - ts) > SIGNATURE_MAX_SKEW_SECONDS) {
    return { ok: false, reason: "timestamp outside allowed window" };
  }

  const expected = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");

  // Timing-safe comparison requires equal-length buffers. Hex output is fixed
  // at 64 chars for sha256, but a malformed `signature` could differ — bail
  // before timingSafeEqual would throw.
  if (signature.length !== expected.length) {
    return { ok: false, reason: "signature length mismatch" };
  }
  const a = Buffer.from(signature, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, reason: "signature mismatch" };
  }
  return { ok: true };
}

/**
 * Generates a one-time widget session URL the user can be redirected to in
 * order to connect a health source (Apple Health, Google Fit, Fitbit, …).
 *
 * `referenceId` should be our internal user.id — Terra echoes it back on the
 * auth webhook so we can map their user_id to ours without holding session
 * state across the redirect.
 */
export async function generateWidgetSession(params: {
  config: TerraConfig;
  referenceId: string;
  providers: string[];
  language?: string;
  authSuccessRedirectUrl?: string;
  authFailureRedirectUrl?: string;
}): Promise<{ url: string; sessionId: string; expiresIn: number }> {
  const {
    config,
    referenceId,
    providers,
    language,
    authSuccessRedirectUrl,
    authFailureRedirectUrl,
  } = params;

  const res = await fetch(`${TERRA_API_BASE}/auth/generateWidgetSession`, {
    method: "POST",
    headers: {
      "dev-id": config.devId,
      "x-api-key": config.apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      reference_id: referenceId,
      providers: providers.join(","),
      language: language ?? "en",
      auth_success_redirect_url: authSuccessRedirectUrl,
      auth_failure_redirect_url: authFailureRedirectUrl,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Terra generateWidgetSession failed: ${res.status} ${text}`);
  }

  const data = (await res.json()) as {
    status?: string;
    session_id?: string;
    url?: string;
    expires_in?: number;
  };
  if (!data.url || !data.session_id) {
    throw new Error(`Terra generateWidgetSession returned no url: ${JSON.stringify(data)}`);
  }
  return { url: data.url, sessionId: data.session_id, expiresIn: data.expires_in ?? 0 };
}

/**
 * Tells Terra to stop sending data for a connected user. Idempotent on
 * Terra's side — a 404 means the connection was already gone, which is fine.
 */
export async function deauthenticateUser(params: {
  config: TerraConfig;
  terraUserId: string;
}): Promise<void> {
  const { config, terraUserId } = params;
  const res = await fetch(
    `${TERRA_API_BASE}/auth/deauthenticateUser?user_id=${encodeURIComponent(terraUserId)}`,
    {
      method: "DELETE",
      headers: {
        "dev-id": config.devId,
        "x-api-key": config.apiKey,
      },
    }
  );
  if (!res.ok && res.status !== 404) {
    const text = await res.text().catch(() => "");
    throw new Error(`Terra deauthenticateUser failed: ${res.status} ${text}`);
  }
}

// ── Webhook payload types ─────────────────────────────────────────────────
// Terra's payloads are large and have many optional fields; we only model
// the subset we actually consume. Anything else is allowed-through via
// `[key: string]: unknown` so a future field doesn't break parsing.

export interface TerraUser {
  user_id: string;
  reference_id?: string | null;
  provider?: string | null;
  [key: string]: unknown;
}

export interface TerraAuthEvent {
  type: "auth";
  status?: string;
  user: TerraUser;
  [key: string]: unknown;
}

export interface TerraDeauthEvent {
  type: "deauth" | "access_revoked";
  user: TerraUser;
  [key: string]: unknown;
}

// A "daily" data payload bundles one or more day-summaries. We only need
// steps + distance + calories + active minutes from each entry.
export interface TerraDailyEntry {
  metadata?: { start_time?: string; end_time?: string };
  distance_data?: {
    steps?: number;
    distance_meters?: number;
  };
  calories_data?: {
    total_burned_calories?: number;
  };
  active_durations_data?: {
    activity_seconds?: number;
  };
  [key: string]: unknown;
}

export interface TerraDailyEvent {
  type: "daily";
  user: TerraUser;
  data: TerraDailyEntry[];
  [key: string]: unknown;
}

export type TerraWebhookEvent =
  | TerraAuthEvent
  | TerraDeauthEvent
  | TerraDailyEvent
  | { type: string; user?: TerraUser; [key: string]: unknown };

/**
 * Parses one daily entry into the shape we store in `daily_stats`. Returns
 * null if the entry has no usable date — those get dropped, not zero-filled.
 *
 * `start_time` is treated as the local-day boundary: Terra includes the tz
 * offset in the string, so the YYYY-MM-DD prefix is already the user's
 * local date for that summary. Slicing 10 chars avoids re-deriving tz here.
 */
export function mapDailyEntry(entry: TerraDailyEntry): {
  date: string;
  steps: number;
  distanceKm: string;
  caloriesBurned: number;
  activeMinutes: number;
} | null {
  const start = entry.metadata?.start_time;
  if (typeof start !== "string" || start.length < 10) return null;
  const date = start.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;

  const steps = Math.max(0, Math.round(entry.distance_data?.steps ?? 0));
  const distanceMeters = Math.max(0, entry.distance_data?.distance_meters ?? 0);
  const distanceKm = (distanceMeters / 1000).toFixed(2);
  const caloriesBurned = Math.max(0, Math.round(entry.calories_data?.total_burned_calories ?? 0));
  const activeMinutes = Math.max(
    0,
    Math.round((entry.active_durations_data?.activity_seconds ?? 0) / 60)
  );

  return { date, steps, distanceKm, caloriesBurned, activeMinutes };
}
