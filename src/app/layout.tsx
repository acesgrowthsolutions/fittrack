import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import type { Metadata } from "next";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "FitTrack - Fitness Tracker",
    template: "%s | FitTrack",
  },
  description:
    "Track your fitness journey with FitTrack. Log workouts, monitor steps, set goals, and get AI-powered coaching.",
  keywords: [
    "Fitness",
    "Workout Tracker",
    "Step Counter",
    "Health",
    "AI Coach",
    "Fitness Goals",
  ],
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "FitTrack",
    title: "FitTrack - Track Your Fitness Journey",
    description:
      "Steps, workouts, calories, goals, and achievements -- all in one place.",
  },
  twitter: {
    card: "summary_large_image",
    title: "FitTrack - Track Your Fitness Journey",
    description:
      "Steps, workouts, calories, goals, and achievements -- all in one place.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

// JSON-LD structured data for SEO
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "FitTrack",
  description:
    "Track your fitness journey with workouts, steps, calories, goals, and AI coaching.",
  applicationCategory: "HealthApplication",
  operatingSystem: "Any",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <SiteHeader />
          <main id="main-content">{children}</main>
          <SiteFooter />
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
