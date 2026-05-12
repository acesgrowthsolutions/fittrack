/**
 * Cheap liveness probe for uptime monitors (UptimeRobot, Better Stack,
 * Vercel uptime, etc.). Returns 200 if the Next.js process can respond —
 * no DB or auth probes, so it runs in ~ms instead of the seconds the
 * /api/diagnostics route can take.
 *
 * Use /api/diagnostics for setup/config validation; use this for
 * "is the site up at all" alerting.
 */
export function GET() {
  return new Response("ok", {
    status: 200,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
