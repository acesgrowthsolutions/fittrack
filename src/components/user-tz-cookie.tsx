"use client";

import { useEffect } from "react";
import { getLocalTz } from "@/lib/local-date";
import { USER_TZ_COOKIE } from "@/lib/user-tz-constants";

/**
 * Writes the browser's IANA timezone to a cookie so server-side date math
 * (today/yesterday/start-of-week, streak boundaries, etc.) can work in the
 * user's local time instead of UTC.
 *
 * Re-runs only when the resolved tz changes (e.g., user moves devices) since
 * the cookie has a 2-year max-age.
 */
export function UserTzCookie() {
  useEffect(() => {
    const tz = getLocalTz();
    const existing = document.cookie
      .split("; ")
      .find((c) => c.startsWith(`${USER_TZ_COOKIE}=`))
      ?.split("=")[1];

    if (existing === tz) return;

    document.cookie = [
      `${USER_TZ_COOKIE}=${encodeURIComponent(tz)}`,
      "Path=/",
      "Max-Age=63072000", // 2 years
      "SameSite=Lax",
    ].join("; ");
  }, []);

  return null;
}
