// Constants shared between server-side cookie reading and client-side cookie
// writing. Kept in a separate module so the client bundle doesn't pull in
// `next/headers` via src/lib/user-tz.ts.

export const USER_TZ_COOKIE = "user-tz";
export const DEFAULT_TZ = "UTC";
