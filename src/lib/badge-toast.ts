"use client";

/**
 * Shows celebratory toasts for newly earned badges. The mutating fitness
 * endpoints return `newBadges: BadgeType[]` after running checkAchievements,
 * and every client form that POSTs to them should pipe that array through
 * here so the user gets immediate feedback instead of having to discover
 * the badge on /achievements later.
 *
 * Safe to call with an empty/missing/malformed array — no-ops if so.
 * Unknown badge types are skipped silently rather than throwing, in case
 * the server is ahead of the client bundle on a deploy.
 */

import { toast } from "sonner";
import { BADGE_DEFINITIONS, type BadgeType } from "@/lib/badge-definitions";

const BADGE_BY_TYPE = new Map(BADGE_DEFINITIONS.map((b) => [b.type, b]));

export function showNewBadgeToasts(newBadges: unknown): void {
  if (!Array.isArray(newBadges) || newBadges.length === 0) return;

  for (const type of newBadges as BadgeType[]) {
    const badge = BADGE_BY_TYPE.get(type);
    if (!badge) continue;
    toast.success(`Achievement unlocked: ${badge.name}`, {
      description: badge.description,
      // Slightly longer than the default 4s — a quick action toast is easy
      // to miss, and a new badge is genuinely worth pausing for.
      duration: 6000,
    });
  }
}
