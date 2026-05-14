/**
 * Status + disconnect endpoints for the current user's Terra integration.
 *
 *   GET    → returns connection state (provider/source/lastSyncAt) or 404
 *   DELETE → calls Terra deauth, then marks the row disconnected
 */

import { headers } from "next/headers";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { healthIntegration } from "@/lib/schema";
import { deauthenticateUser, getTerraConfig } from "@/lib/terra";

const PROVIDER = "terra";

export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [row] = await db
      .select({
        status: healthIntegration.status,
        source: healthIntegration.source,
        connectedAt: healthIntegration.connectedAt,
        lastSyncAt: healthIntegration.lastSyncAt,
      })
      .from(healthIntegration)
      .where(
        and(
          eq(healthIntegration.userId, session.user.id),
          eq(healthIntegration.provider, PROVIDER)
        )
      )
      .limit(1);

    if (!row) {
      return Response.json({ connected: false });
    }

    return Response.json({
      connected: row.status === "active",
      status: row.status,
      source: row.source,
      connectedAt: row.connectedAt,
      lastSyncAt: row.lastSyncAt,
    });
  } catch (error) {
    console.error("Terra status fetch failed:", error);
    return Response.json({ error: "Failed to load integration status" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [row] = await db
      .select({
        externalUserId: healthIntegration.externalUserId,
        status: healthIntegration.status,
      })
      .from(healthIntegration)
      .where(
        and(
          eq(healthIntegration.userId, session.user.id),
          eq(healthIntegration.provider, PROVIDER)
        )
      )
      .limit(1);

    if (!row || row.status !== "active") {
      return Response.json({ connected: false });
    }

    // Best-effort Terra-side deauth. If the API call fails we still mark
    // the row disconnected locally so the user isn't stuck — they can
    // re-trigger deauth from the Terra dashboard if needed.
    const config = getTerraConfig();
    if (config) {
      try {
        await deauthenticateUser({ config, terraUserId: row.externalUserId });
      } catch (err) {
        console.error("Terra deauth API call failed; marking disconnected anyway:", err);
      }
    }

    await db
      .update(healthIntegration)
      .set({ status: "disconnected", updatedAt: new Date() })
      .where(
        and(
          eq(healthIntegration.userId, session.user.id),
          eq(healthIntegration.provider, PROVIDER)
        )
      );

    return Response.json({ connected: false });
  } catch (error) {
    console.error("Terra disconnect failed:", error);
    return Response.json({ error: "Failed to disconnect" }, { status: 500 });
  }
}
