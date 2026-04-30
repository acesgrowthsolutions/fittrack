"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Trophy,
  Flame,
  Footprints,
  Award,
  Star,
  Zap,
  Medal,
  Crown,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import { UserProfile } from "@/components/auth/user-profile";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/lib/auth-client";
import type { LucideIcon } from "lucide-react";

interface Achievement {
  id: string;
  badgeType: string;
  badgeName: string;
  description: string;
  earnedAt: string;
}

interface BadgeDefinition {
  type: string;
  name: string;
  description: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
}

/**
 * All available badge definitions. Earned badges are highlighted, the rest
 * are shown in a locked state.
 */
const ALL_BADGES: BadgeDefinition[] = [
  {
    type: "first_workout",
    name: "First Workout",
    description: "Complete your first workout",
    icon: Star,
    color: "text-yellow-400",
    bgColor: "bg-yellow-400/10",
  },
  {
    type: "week_warrior",
    name: "Week Warrior",
    description: "Log activity for 7 consecutive days",
    icon: Flame,
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
  },
  {
    type: "10k_steps",
    name: "10K Steps",
    description: "Reach 10,000 steps in a single day",
    icon: Footprints,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  {
    type: "half_marathon",
    name: "Half Marathon",
    description: "Run a cumulative half marathon (21.1 km)",
    icon: Medal,
    color: "text-teal-500",
    bgColor: "bg-teal-500/10",
  },
  {
    type: "marathon",
    name: "Marathon",
    description: "Run a cumulative marathon (42.2 km)",
    icon: Award,
    color: "text-red-500",
    bgColor: "bg-red-500/10",
  },
  {
    type: "century_club",
    name: "Century Club",
    description: "Complete 100 workouts",
    icon: Crown,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
  },
  {
    type: "iron_week",
    name: "Iron Week",
    description: "Complete 7 workouts in a single week",
    icon: Trophy,
    color: "text-pink-500",
    bgColor: "bg-pink-500/10",
  },
  {
    type: "speed_demon",
    name: "Speed Demon",
    description: "Complete a workout with a pace under 5 min/km",
    icon: Zap,
    color: "text-green-500",
    bgColor: "bg-green-500/10",
  },
  {
    type: "early_bird",
    name: "Early Bird",
    description: "Log a workout before 7 AM",
    icon: Star,
    color: "text-cyan-500",
    bgColor: "bg-cyan-500/10",
  },
];

export default function AchievementsPage() {
  const { data: session, isPending } = useSession();
  const [earned, setEarned] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAchievements = useCallback(async () => {
    try {
      const res = await fetch("/api/fitness/achievements");
      if (!res.ok) throw new Error("Failed to fetch achievements");
      setEarned(await res.json());
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to load achievements"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session) fetchAchievements();
  }, [session, fetchAchievements]);

  if (isPending) {
    return (
      <div className="container mx-auto p-6">
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <p className="text-muted-foreground mb-4">
          Sign in to view your achievements
        </p>
        <UserProfile />
      </div>
    );
  }

  const earnedTypes = new Set(earned.map((a) => a.badgeType));

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Achievements</h1>
        <p className="text-muted-foreground">
          {earned.length} of {ALL_BADGES.length} badges earned
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {ALL_BADGES.map((badge) => {
            const isEarned = earnedTypes.has(badge.type);
            const earnedData = earned.find((a) => a.badgeType === badge.type);
            const Icon = badge.icon;

            return (
              <Card
                key={badge.type}
                className={isEarned ? "" : "opacity-50 grayscale"}
              >
                <CardContent className="p-4 flex flex-col items-center text-center space-y-2">
                  <div
                    className={`rounded-full p-3 ${
                      isEarned ? badge.bgColor : "bg-muted"
                    }`}
                  >
                    {isEarned ? (
                      <Icon className={`h-8 w-8 ${badge.color}`} />
                    ) : (
                      <Lock className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>
                  <p className="font-semibold text-sm">{badge.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {badge.description}
                  </p>
                  {isEarned && earnedData && (
                    <p className="text-xs text-muted-foreground">
                      Earned{" "}
                      {new Date(earnedData.earnedAt).toLocaleDateString(
                        "en-US",
                        { month: "short", day: "numeric", year: "numeric" }
                      )}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
