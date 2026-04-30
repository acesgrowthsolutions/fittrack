"use client";

import Link from "next/link";
import {
  Footprints,
  Dumbbell,
  Flame,
  Bot,
  Target,
  Trophy,
  Activity,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/auth-client";

const FEATURES = [
  {
    icon: Footprints,
    title: "Step Tracking",
    description:
      "Monitor your daily steps with progress rings and weekly charts to stay on top of your activity.",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  {
    icon: Dumbbell,
    title: "Workout Logging",
    description:
      "Log running, cycling, strength training, yoga and more. Track duration, calories, and distance.",
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
  },
  {
    icon: Flame,
    title: "Calorie Tracking",
    description:
      "See how many calories you burn each day across all your activities with detailed charts.",
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
  },
  {
    icon: Target,
    title: "Goal Setting",
    description:
      "Set daily, weekly, or monthly fitness goals and track your progress with visual indicators.",
    color: "text-yellow-500",
    bgColor: "bg-yellow-500/10",
  },
  {
    icon: Trophy,
    title: "Achievements",
    description:
      "Earn badges for milestones like streaks, step records, and workout counts to stay motivated.",
    color: "text-green-500",
    bgColor: "bg-green-500/10",
  },
  {
    icon: Bot,
    title: "AI Fitness Coach",
    description:
      "Get personalized workout plans, nutrition advice, and motivation from your AI-powered coach.",
    color: "text-cyan-500",
    bgColor: "bg-cyan-500/10",
  },
];

export default function Home() {
  const { data: session } = useSession();

  return (
    <main className="flex-1">
      {/* Hero */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10">
              <Activity className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
            Track Your{" "}
            <span className="bg-gradient-to-r from-blue-500 via-purple-500 to-orange-500 bg-clip-text text-transparent">
              Fitness Journey
            </span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Steps, workouts, calories, goals, and achievements -- all in one
            place. FitTrack helps you build healthy habits and reach your
            fitness potential.
          </p>
          <div className="flex items-center justify-center gap-4 pt-4">
            {session ? (
              <Button asChild size="lg">
                <Link href="/dashboard">
                  Go to Dashboard
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <>
                <Button asChild size="lg">
                  <Link href="/register">
                    Get Started Free
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link href="/login">Sign In</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-3">Everything You Need</h2>
          <p className="text-muted-foreground text-lg">
            Comprehensive fitness tracking with AI-powered coaching
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="p-6 border rounded-lg hover:shadow-md transition-shadow"
            >
              <div className={`${feature.bgColor} rounded-lg p-3 w-fit mb-4`}>
                <feature.icon className={`h-6 w-6 ${feature.color}`} />
              </div>
              <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      {!session && (
        <section className="container mx-auto px-4 py-16">
          <div className="bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-orange-500/10 rounded-2xl p-12 text-center">
            <h2 className="text-3xl font-bold mb-4">
              Ready to Start Your Fitness Journey?
            </h2>
            <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
              Join FitTrack today and take the first step towards a healthier,
              more active lifestyle.
            </p>
            <Button asChild size="lg">
              <Link href="/register">
                Create Free Account
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>
      )}
    </main>
  );
}
