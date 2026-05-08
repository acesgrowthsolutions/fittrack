/**
 * Client-side helpers for getting the user's local date as YYYY-MM-DD.
 * Use these instead of `new Date().toISOString().split("T")[0]`, which
 * returns UTC and silently drifts up to 12 hours from the user's day.
 */

export function getLocalTz(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export function getLocalDateStr(now: Date = new Date()): string {
  // en-CA produces ISO-style YYYY-MM-DD without locale formatting quirks.
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: getLocalTz(),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const y = parts.find((p) => p.type === "year")?.value ?? "1970";
  const m = parts.find((p) => p.type === "month")?.value ?? "01";
  const d = parts.find((p) => p.type === "day")?.value ?? "01";
  return `${y}-${m}-${d}`;
}
