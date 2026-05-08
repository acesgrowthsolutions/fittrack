import { cookies } from "next/headers";
import { isValidIanaTz } from "@/lib/date-tz";
import { USER_TZ_COOKIE, DEFAULT_TZ } from "@/lib/user-tz-constants";

export { USER_TZ_COOKIE, DEFAULT_TZ };

/**
 * Read the user's IANA timezone from the `user-tz` cookie, falling back to
 * UTC if the cookie is missing or invalid. The cookie is set client-side on
 * mount via <UserTzCookie> in the root layout.
 */
export async function getUserTz(): Promise<string> {
  const store = await cookies();
  const raw = store.get(USER_TZ_COOKIE)?.value;
  if (!raw) return DEFAULT_TZ;
  const decoded = decodeURIComponent(raw);
  if (!isValidIanaTz(decoded)) return DEFAULT_TZ;
  return decoded;
}
