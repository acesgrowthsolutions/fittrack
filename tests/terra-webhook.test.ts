/**
 * Tests for the Terra webhook handler. Split in two halves:
 *
 *   1. Unit tests for `mapDailyEntry` — the pure payload-shaping logic.
 *   2. Source-level checks that the webhook route still wires up signature
 *      verification, raw-body reading, and dispatch the way we expect.
 *      Mirrors the existing pattern in achievements-route.test.ts.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { mapDailyEntry, type TerraDailyEntry } from "@/lib/terra";

describe("mapDailyEntry", () => {
  it("extracts the local date from start_time even with a timezone offset", () => {
    const entry: TerraDailyEntry = {
      metadata: { start_time: "2026-04-15T00:00:00-05:00" },
      distance_data: { steps: 12_345, distance_meters: 9_876 },
      calories_data: { total_burned_calories: 2_400 },
      active_durations_data: { activity_seconds: 3_600 },
    };
    expect(mapDailyEntry(entry)).toEqual({
      date: "2026-04-15",
      steps: 12_345,
      distanceKm: "9.88",
      caloriesBurned: 2_400,
      activeMinutes: 60,
    });
  });

  it("zero-fills missing measurement fields rather than failing", () => {
    const entry: TerraDailyEntry = { metadata: { start_time: "2026-04-15T00:00:00Z" } };
    expect(mapDailyEntry(entry)).toEqual({
      date: "2026-04-15",
      steps: 0,
      distanceKm: "0.00",
      caloriesBurned: 0,
      activeMinutes: 0,
    });
  });

  it("returns null when start_time is missing", () => {
    expect(mapDailyEntry({})).toBeNull();
  });

  it("returns null when start_time is not an ISO date string", () => {
    expect(mapDailyEntry({ metadata: { start_time: "not-a-date" } })).toBeNull();
  });

  it("rounds fractional step counts down to integers", () => {
    const entry: TerraDailyEntry = {
      metadata: { start_time: "2026-04-15T00:00:00Z" },
      distance_data: { steps: 8_421.7 },
    };
    expect(mapDailyEntry(entry)?.steps).toBe(8_422);
  });

  it("clamps negative values from the provider to zero", () => {
    // Some providers (notably Garmin) have been observed to report negative
    // distance or calorie deltas on partial syncs. Refuse to write those.
    const entry: TerraDailyEntry = {
      metadata: { start_time: "2026-04-15T00:00:00Z" },
      distance_data: { steps: -5, distance_meters: -200 },
      calories_data: { total_burned_calories: -50 },
      active_durations_data: { activity_seconds: -60 },
    };
    expect(mapDailyEntry(entry)).toEqual({
      date: "2026-04-15",
      steps: 0,
      distanceKm: "0.00",
      caloriesBurned: 0,
      activeMinutes: 0,
    });
  });

  it("rounds seconds → minutes to the nearest minute", () => {
    const entry: TerraDailyEntry = {
      metadata: { start_time: "2026-04-15T00:00:00Z" },
      active_durations_data: { activity_seconds: 89 },
    };
    expect(mapDailyEntry(entry)?.activeMinutes).toBe(1);
    const longer: TerraDailyEntry = {
      metadata: { start_time: "2026-04-15T00:00:00Z" },
      active_durations_data: { activity_seconds: 91 },
    };
    expect(mapDailyEntry(longer)?.activeMinutes).toBe(2);
  });

  it("formats distance to two decimal places of km", () => {
    const entry: TerraDailyEntry = {
      metadata: { start_time: "2026-04-15T00:00:00Z" },
      distance_data: { distance_meters: 5_237 },
    };
    expect(mapDailyEntry(entry)?.distanceKm).toBe("5.24");
  });
});

describe("Terra webhook route source", () => {
  const route = readFileSync(
    path.resolve("src/app/api/integrations/terra/webhook/route.ts"),
    "utf8"
  );

  it("reads the raw body BEFORE parsing JSON (signature is over raw bytes)", () => {
    const rawIdx = route.indexOf("await req.text()");
    const parseIdx = route.indexOf("JSON.parse(rawBody)");
    expect(rawIdx).toBeGreaterThan(0);
    expect(parseIdx).toBeGreaterThan(rawIdx);
  });

  it("verifies the signature before doing any work", () => {
    const verifyIdx = route.indexOf("verifyTerraSignature(");
    const parseIdx = route.indexOf("JSON.parse(rawBody)");
    expect(verifyIdx).toBeGreaterThan(0);
    expect(parseIdx).toBeGreaterThan(verifyIdx);
  });

  it("returns 401 when the signature is invalid", () => {
    expect(route).toMatch(/Invalid signature["'][^)]*\bstatus:\s*401\b/);
  });

  it("returns 503 when Terra is not configured", () => {
    expect(route).toMatch(/getTerraConfig\(\)/);
    expect(route).toMatch(/Terra not configured["'][^)]*\bstatus:\s*503\b/);
  });

  it("dispatches on event type with auth/deauth/daily branches", () => {
    expect(route).toMatch(/case\s+["']auth["']/);
    expect(route).toMatch(/case\s+["']deauth["']/);
    expect(route).toMatch(/case\s+["']daily["']/);
  });

  it("acks unknown event types with 200 so Terra stops retrying", () => {
    // The default branch falls through to the bottom-of-function "ok" 200.
    expect(route).toMatch(/return new Response\(\s*["']ok["'],\s*\{\s*status:\s*200/);
  });

  it("uses OVERWRITE semantics for daily upserts, not SUM", () => {
    // SUM would compound on retries — make sure we set, not add.
    expect(route).toMatch(/onConflictDoUpdate/);
    expect(route).not.toMatch(/dailyStats\.steps\}\s*\+/);
  });
});

describe("Terra connect route source", () => {
  const route = readFileSync(
    path.resolve("src/app/api/integrations/terra/connect/route.ts"),
    "utf8"
  );

  it("requires an authenticated session", () => {
    expect(route).toMatch(/auth\.api\.getSession/);
    expect(route).toMatch(/Unauthorized["'][^)]*\bstatus:\s*401\b/);
  });

  it("returns 503 when Terra is not configured", () => {
    expect(route).toMatch(/getTerraConfig\(\)/);
    expect(route).toMatch(/not configured["'][^)]*\bstatus:\s*503\b/);
  });

  it("passes the user's id as reference_id so the webhook can map back", () => {
    expect(route).toMatch(/referenceId:\s*session\.user\.id/);
  });
});

describe("Terra status/disconnect route source", () => {
  const route = readFileSync(
    path.resolve("src/app/api/integrations/terra/route.ts"),
    "utf8"
  );

  it("exposes both GET and DELETE handlers", () => {
    expect(route).toMatch(/export\s+async\s+function\s+GET\b/);
    expect(route).toMatch(/export\s+async\s+function\s+DELETE\b/);
  });

  it("marks the row disconnected even if the Terra deauth API call fails", () => {
    // Safety: don't strand the user in a "still connected on our side"
    // state because of a transient Terra outage.
    expect(route).toMatch(/marking disconnected anyway/);
    expect(route).toMatch(/status:\s*["']disconnected["']/);
  });
});
