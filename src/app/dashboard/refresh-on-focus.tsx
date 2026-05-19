"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

// Re-fetches the Server Component's data when the tab regains focus or
// becomes visible, so stats stay current after the user logs activity in
// another tab or returns from a wearable app. Throttled to once per
// REFETCH_THROTTLE_MS — without that, every alt-tab fires a fresh server
// render which re-runs all of getSummary's DB queries.

const REFETCH_THROTTLE_MS = 60_000;

export function RefreshOnFocus() {
  const router = useRouter();
  // Initialized to 0 — Date.now() can't run during render (react-hooks/purity).
  // The mount effect below seeds it with the actual current time so the
  // first focus event after mount is still throttled. Re-seeding has to be
  // gated: the effect re-runs every time `router` changes identity (which
  // happens on every router.refresh()), so an unguarded `lastRefreshRef =
  // Date.now()` would push the throttle window forward and effectively
  // double it. Only seed on the true initial mount.
  const lastRefreshRef = useRef<number>(0);

  useEffect(() => {
    if (lastRefreshRef.current === 0) {
      lastRefreshRef.current = Date.now();
    }

    const refresh = () => {
      if (Date.now() - lastRefreshRef.current < REFETCH_THROTTLE_MS) return;
      lastRefreshRef.current = Date.now();
      router.refresh();
    };
    const handleVisibility = () => {
      if (document.visibilityState === "visible") refresh();
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", refresh);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", refresh);
    };
  }, [router]);

  return null;
}
