import { and, eq, gte, lt, sql } from "drizzle-orm";
import { db } from "./db";
import { rateLimitEvent } from "./schema";

export interface RateLimitWindow {
  /** Max calls allowed in this window */
  max: number;
  /** Window length in milliseconds */
  windowMs: number;
  /** Human label for the response (e.g. "hour", "day") */
  label: string;
}

export interface RateLimitOk {
  ok: true;
}

export interface RateLimitDenied {
  ok: false;
  /** Which window was exceeded */
  exceeded: RateLimitWindow;
  /** Seconds until the user can retry under the exceeded window */
  retryAfterSec: number;
}

export type RateLimitResult = RateLimitOk | RateLimitDenied;

/**
 * Sliding-window rate limit backed by Postgres. Counts events for
 * (userId, action) within each window, rejects if any limit is exceeded,
 * otherwise records a new event and returns ok.
 *
 * Multiple windows can be supplied and the strictest applies (e.g. both
 * 10/hour AND 30/day to prevent burst + marathon abuse).
 *
 * Old rows older than the largest window are pruned on each call so the
 * table stays bounded.
 */
export async function checkRateLimit(
  userId: string,
  action: string,
  windows: RateLimitWindow[]
): Promise<RateLimitResult> {
  if (windows.length === 0) return { ok: true };

  const now = new Date();
  const largestWindowMs = Math.max(...windows.map((w) => w.windowMs));
  const pruneBefore = new Date(now.getTime() - largestWindowMs);

  // Prune old rows first (cheap with the index).
  await db
    .delete(rateLimitEvent)
    .where(
      and(
        eq(rateLimitEvent.userId, userId),
        eq(rateLimitEvent.action, action),
        lt(rateLimitEvent.occurredAt, pruneBefore)
      )
    );

  // Check each window against the count of recent events.
  for (const w of windows) {
    const since = new Date(now.getTime() - w.windowMs);
    const [row] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(rateLimitEvent)
      .where(
        and(
          eq(rateLimitEvent.userId, userId),
          eq(rateLimitEvent.action, action),
          gte(rateLimitEvent.occurredAt, since)
        )
      );
    const count = row?.count ?? 0;
    if (count >= w.max) {
      // Find the oldest event in this window — when it ages out, the user
      // gets one slot back.
      const [oldest] = await db
        .select({ at: rateLimitEvent.occurredAt })
        .from(rateLimitEvent)
        .where(
          and(
            eq(rateLimitEvent.userId, userId),
            eq(rateLimitEvent.action, action),
            gte(rateLimitEvent.occurredAt, since)
          )
        )
        .orderBy(rateLimitEvent.occurredAt)
        .limit(1);
      const ageMs = oldest
        ? w.windowMs - (now.getTime() - oldest.at.getTime())
        : w.windowMs;
      return {
        ok: false,
        exceeded: w,
        retryAfterSec: Math.max(1, Math.ceil(ageMs / 1000)),
      };
    }
  }

  // Record this event.
  await db.insert(rateLimitEvent).values({
    userId,
    action,
    occurredAt: now,
  });

  return { ok: true };
}

/**
 * Build a 429 Response with Retry-After header from a denied result.
 */
export function rateLimitResponse(denied: RateLimitDenied): Response {
  const { exceeded, retryAfterSec } = denied;
  return Response.json(
    {
      error: `Rate limit exceeded: max ${exceeded.max} per ${exceeded.label}. Try again in ${retryAfterSec}s.`,
      retryAfterSec,
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSec),
      },
    }
  );
}
