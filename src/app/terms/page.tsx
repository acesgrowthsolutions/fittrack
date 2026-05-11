import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms governing your use of FitTrack — the rules, disclaimers, and what to expect.",
  robots: { index: true, follow: true },
};

const LAST_UPDATED = "May 8, 2026";
const CONTACT_EMAIL = "acesgrowthsolutions@gmail.com";

export default function TermsPage() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-12">
      <header className="mb-8 space-y-2">
        <h1 className="text-3xl font-bold">Terms of Service</h1>
        <p className="text-muted-foreground text-sm">Last updated: {LAST_UPDATED}</p>
      </header>

      <div className="space-y-8 text-sm leading-relaxed">
        <section className="space-y-3">
          <p>
            These terms govern your use of FitTrack (the &ldquo;Service&rdquo;). By creating an
            account or signing in, you agree to them. If you don&apos;t agree, please don&apos;t use
            the Service.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">The Service</h2>
          <p>
            FitTrack lets you log workouts, daily stats, meals, and goals, and chat with an AI
            fitness coach. Features may change as the product evolves.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Your account</h2>
          <ul className="ml-5 list-disc space-y-2">
            <li>You must be at least 13 to use FitTrack.</li>
            <li>Provide accurate information when signing up.</li>
            <li>
              You&apos;re responsible for activity under your account. Keep your password (and any
              linked Google account) secure.
            </li>
            <li>
              One person, one account — don&apos;t share credentials or use someone else&apos;s.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Your content</h2>
          <p>
            You own the data you put into FitTrack — your profile, workouts, stats, meal logs,
            goals, and chat messages. You grant us a limited license to store, process, and display
            it back to you so we can run the Service. We don&apos;t sell your data and we don&apos;t
            use it to train AI models.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Acceptable use</h2>
          <p>You agree not to:</p>
          <ul className="ml-5 list-disc space-y-2">
            <li>
              Abuse, attack, or attempt to break the Service, including probing for vulnerabilities
              or bypassing rate limits.
            </li>
            <li>
              Impersonate others, post unlawful content, or use the AI Coach to generate harmful,
              illegal, or deceptive material.
            </li>
            <li>Reverse engineer, scrape, or resell the Service or its outputs.</li>
            <li>Run automated traffic against the Service without prior written permission.</li>
          </ul>
          <p>We can suspend or terminate accounts that violate these rules.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Health and fitness disclaimer</h2>
          <p>
            <strong>FitTrack is not a medical service.</strong> Workout plans, nutrition tips,
            calorie estimates, and AI Coach responses are general information for fitness purposes
            only — not medical advice, diagnosis, or treatment. Always consult a qualified
            healthcare professional before starting a new exercise or nutrition program, especially
            if you have a medical condition, are pregnant, or are taking medication. Stop and seek
            medical help if you experience pain, dizziness, or shortness of breath.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">AI Coach disclaimer</h2>
          <p>
            The AI Coach uses third-party language models. Responses can be inaccurate, incomplete,
            or out of date. Don&apos;t rely on them for medical, legal, or safety-critical
            decisions. Treat the output as a starting point and verify anything that matters.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Service changes &amp; availability</h2>
          <p>
            We may add, change, or remove features without notice. The Service is provided &ldquo;as
            is&rdquo; — we don&apos;t guarantee it will be uninterrupted, error-free, or available
            in your region.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Termination</h2>
          <p>
            You can stop using the Service at any time and request account deletion via{" "}
            {CONTACT_EMAIL}. We can suspend or close accounts that abuse the Service or violate
            these terms. On deletion, your data is removed as described in our{" "}
            <Link href="/privacy" className="text-primary hover:underline">
              Privacy Policy
            </Link>
            .
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Disclaimer of warranties</h2>
          <p>
            To the fullest extent permitted by law, the Service is provided without warranties of
            any kind, express or implied, including merchantability, fitness for a particular
            purpose, and non-infringement.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Limitation of liability</h2>
          <p>
            To the fullest extent permitted by law, we are not liable for indirect, incidental,
            special, consequential, or punitive damages arising from your use of the Service, even
            if we&apos;ve been advised of the possibility. Our total liability for any claim related
            to the Service is limited to the amount you paid us in the 12 months before the claim —
            which, for a free Service, is zero.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Changes to these terms</h2>
          <p>
            We may update these terms. Material changes will be flagged in-app or by email.
            Continued use after an update means you accept the new terms.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Contact</h2>
          <p>
            Questions about these terms:{" "}
            <a className="text-primary hover:underline" href={`mailto:${CONTACT_EMAIL}`}>
              {CONTACT_EMAIL}
            </a>
            .
          </p>
        </section>

        <section className="text-muted-foreground border-t pt-6 text-sm">
          See also our{" "}
          <Link href="/privacy" className="text-primary hover:underline">
            Privacy Policy
          </Link>
          .
        </section>
      </div>
    </div>
  );
}
