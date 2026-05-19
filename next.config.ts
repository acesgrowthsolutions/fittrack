import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // No `output: "standalone"` — that's a Docker-only build mode that traces
  // and copies node_modules into a self-contained server. On Vercel it adds
  // 30–90s to every deploy (preview and prod) for zero runtime benefit, since
  // Vercel does its own tracing. Re-enable only if/when we ship a Docker image
  // alongside Vercel.
  // Image optimization configuration
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
    ],
  },

  // Enable compression
  compress: true,

  // Security headers
  async headers() {
    // Minimal Content-Security-Policy: only directives that do NOT fall back
    // to default-src, so script/style/img/connect remain unrestricted and
    // can't break legitimate flows (Sentry telemetry, Vercel Analytics, the
    // inline tz cookie script, blob meal images, OAuth avatars, etc.). A
    // fuller policy with script-src/connect-src needs a CSP-Report-Only
    // rollout to discover violations first — left for a future pass.
    const csp = [
      "base-uri 'self'", // can't override <base href> to redirect relative URLs
      "form-action 'self'", // form posts can only go to this origin
      "frame-ancestors 'none'", // CSP-level X-Frame-Options DENY
      "object-src 'none'", // block <object>/<embed>/<applet> plugins
    ].join("; ");

    const baseHeaders = [
      { key: "Content-Security-Policy", value: csp },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "X-XSS-Protection", value: "1; mode=block" },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=()",
      },
    ];
    // HSTS only in production: pins the browser to HTTPS for 2 years and
    // opts into the preload list. We deliberately omit this in dev so a
    // localhost mistake can't poison the user's HSTS cache.
    if (process.env.NODE_ENV === "production") {
      baseHeaders.push({
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload",
      });
    }
    return [{ source: "/(.*)", headers: baseHeaders }];
  },
};

// Wrap with Sentry. Source-map upload only runs when SENTRY_AUTH_TOKEN +
// SENTRY_ORG + SENTRY_PROJECT are present (auto-provisioned by the Vercel
// Marketplace integration). Without them this is effectively a no-op wrapper.
//
// `disableLogger` was removed: Sentry deprecated it in favor of
// `webpack.treeshake.removeDebugLogging`, but that option is not supported
// under Turbopack (Next.js 16's default bundler). The small bundle-size
// increase from the leftover logger code is acceptable until Sentry ships a
// Turbopack-compatible replacement.
const sentryOptions = {
  silent: !process.env.CI,
  widenClientFileUpload: true,
  ...(process.env.SENTRY_ORG ? { org: process.env.SENTRY_ORG } : {}),
  ...(process.env.SENTRY_PROJECT ? { project: process.env.SENTRY_PROJECT } : {}),
  ...(process.env.SENTRY_AUTH_TOKEN ? { authToken: process.env.SENTRY_AUTH_TOKEN } : {}),
};

export default withSentryConfig(nextConfig, sentryOptions);
