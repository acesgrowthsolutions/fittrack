import Link from "next/link"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How FitTrack collects, uses, and protects your fitness and account data.",
  robots: { index: true, follow: true },
}

const LAST_UPDATED = "May 8, 2026"
const CONTACT_EMAIL = "acesgrowthsolutions@gmail.com"

export default function PrivacyPage() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-12">
      <header className="mb-8 space-y-2">
        <h1 className="text-3xl font-bold">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground">
          Last updated: {LAST_UPDATED}
        </p>
      </header>

      <div className="space-y-8 text-sm leading-relaxed">
        <section className="space-y-3">
          <p>
            FitTrack (&ldquo;we&rdquo;, &ldquo;us&rdquo;) is a personal fitness
            tracking app. This policy explains what data we collect, why we
            collect it, who we share it with, and the choices you have. We aim
            for plain language over legalese.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">What we collect</h2>
          <ul className="ml-5 list-disc space-y-2">
            <li>
              <strong>Account data.</strong> Your name, email, and a one-way
              hash of your password (via Better Auth). If you sign in with
              Google, we receive your name, email, profile picture, and a
              Google account ID.
            </li>
            <li>
              <strong>Fitness profile.</strong> Age, height, weight, preferred
              units, daily step and calorie goals, and activity level — only
              what you choose to enter.
            </li>
            <li>
              <strong>Activity data.</strong> Workouts, daily stats (steps,
              calories burned, active minutes), meals (including any photos
              you upload for analysis), goals, and achievements you log in the
              app.
            </li>
            <li>
              <strong>AI Coach conversations.</strong> Messages you send to
              the AI Coach are forwarded to our AI provider so the model can
              respond. Recent fitness context (your profile, last 7 days of
              stats, recent workouts, active goals) is included to personalize
              advice.
            </li>
            <li>
              <strong>Operational data.</strong> Session cookies, IP address,
              user agent, basic page-view analytics, and error reports needed
              to keep the app running.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">How we use it</h2>
          <ul className="ml-5 list-disc space-y-2">
            <li>To run your account and show you your own data.</li>
            <li>To generate personalized AI fitness coaching responses.</li>
            <li>To send transactional emails (verification, password reset).</li>
            <li>To detect and fix bugs and abuse.</li>
          </ul>
          <p>
            We don&apos;t sell your data. We don&apos;t use it for advertising.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Who we share it with</h2>
          <p>
            We use third-party providers who process data on our behalf. Each
            sees only what they need to do their job:
          </p>
          <ul className="ml-5 list-disc space-y-2">
            <li>
              <strong>Vercel</strong> — application hosting, deployment, basic
              analytics, and performance metrics.
            </li>
            <li>
              <strong>Neon</strong> — managed PostgreSQL where your account
              and fitness data is stored.
            </li>
            <li>
              <strong>OpenRouter</strong> — routes AI Coach messages to the
              underlying LLM (default: GPT-class model). Messages and the
              fitness context described above are sent on each request.
            </li>
            <li>
              <strong>Resend</strong> — sends transactional emails (sign-up
              verification, password reset).
            </li>
            <li>
              <strong>Sentry</strong> — error monitoring. Stack traces and
              limited request metadata are captured when something goes wrong.
            </li>
            <li>
              <strong>Google</strong> — only if you choose &ldquo;Continue
              with Google&rdquo;. Google sees that you&apos;re signing in to
              FitTrack and returns the profile fields above.
            </li>
            <li>
              <strong>Vercel Blob</strong> — stores uploaded images (e.g.
              meal photos).
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Retention</h2>
          <p>
            Account and fitness data is kept for as long as your account is
            active. When you delete your account, your user record and all
            related rows (sessions, workouts, daily stats, meals, goals,
            achievements) are removed via cascading delete. Sentry error
            reports and aggregated analytics may persist for a limited
            retention window set by the provider.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Your choices</h2>
          <ul className="ml-5 list-disc space-y-2">
            <li>
              <strong>Access.</strong> Your dashboard, workouts, and profile
              pages show everything stored about you.
            </li>
            <li>
              <strong>Correction.</strong> Edit your profile and any logged
              entries directly in the app.
            </li>
            <li>
              <strong>Deletion.</strong> Email us at {CONTACT_EMAIL} to
              request account deletion if the in-app flow doesn&apos;t cover
              your case.
            </li>
            <li>
              <strong>Email opt-out.</strong> The only emails we send are
              transactional (verification, password reset). There&apos;s no
              marketing list to unsubscribe from.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Security</h2>
          <p>
            Data is transmitted over HTTPS and stored in encrypted-at-rest
            managed databases. Passwords are stored only as one-way hashes.
            Sessions are HTTP-only cookies. We rate-limit auth endpoints to
            slow down brute-force attempts. No system is perfectly secure;
            please use a strong, unique password.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Children</h2>
          <p>
            FitTrack is not directed to children under 13. We don&apos;t
            knowingly collect data from anyone under 13. If you believe a
            child has signed up, contact us and we&apos;ll remove the account.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Changes</h2>
          <p>
            If we change this policy, we&apos;ll update the &ldquo;Last
            updated&rdquo; date above. Material changes will also be flagged
            in-app or by email.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Contact</h2>
          <p>
            Questions or requests:{" "}
            <a
              className="text-primary hover:underline"
              href={`mailto:${CONTACT_EMAIL}`}
            >
              {CONTACT_EMAIL}
            </a>
            .
          </p>
        </section>

        <section className="border-t pt-6 text-sm text-muted-foreground">
          See also our{" "}
          <Link href="/terms" className="text-primary hover:underline">
            Terms of Service
          </Link>
          .
        </section>
      </div>
    </div>
  )
}
