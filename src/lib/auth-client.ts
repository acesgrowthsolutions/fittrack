import { createAuthClient } from "better-auth/react";

// Resolve baseURL from the current page origin in the browser so the client
// targets whichever deploy URL the user is on (prod alias, preview hash, or
// localhost). NEXT_PUBLIC_APP_URL is only used as an SSR fallback because
// previews don't have a stable URL bound to that env var, and a stale
// production value there causes cross-origin "Failed to fetch" errors when
// the same client bundle ships to a preview host.
const baseURL =
  typeof window !== "undefined"
    ? window.location.origin
    : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const authClient = createAuthClient({
  baseURL,
});

export const {
  signIn,
  signOut,
  signUp,
  useSession,
  getSession,
  listSessions,
  revokeSession,
  revokeOtherSessions,
  requestPasswordReset,
  resetPassword,
  changePassword,
  updateUser,
  sendVerificationEmail,
  linkSocial,
  listAccounts,
  unlinkAccount,
} = authClient;
