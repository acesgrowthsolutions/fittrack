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
  Sparkles,
  MapPin,
  Hourglass,
  Sunrise,
} from "lucide-react";
import { toast } from "sonner";
import { UserProfile } from "@/components/auth/user-profile";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/lib/auth-client";
import { BADGE_DEFINITIONS, type BadgeType } from "@/lib/badge-definitions";
import type { LucideIcon } from "lucide-react";

interface Achievement {
  id: string;
  badgeType: string;
  badgeName: string;
  description: string;
  earnedAt: string;
}

interface BadgeStyle {
  icon: LucideIcon;
  color: string;
  bgColor: string;
}

// Visual presentation per badge type. Kept separate from the canonical badge
// list so the data file in src/lib/badge-definitions.ts stays free of React
// imports and can be consumed server-side too. Any badge not listed here
// falls back to the neutral default below — adding a new badge to
// BADGE_DEFINITIONS does not require touching this map; it just means the
// new badge renders with the generic Trophy icon until a style is added.
const BADGE_STYLES: Record<BadgeType, BadgeStyle> = {
  first_workout: { icon: Star, color: "text-yellow-400", bgColor: "bg-yellow-400/10" },
  week_warrior: { icon: Flame, color: "text-orange-500", bgColor: "bg-orange-500/10" },
  "10k_steps": { icon: Footprints, color: "text-blue-500", bgColor: "bg-blue-500/10" },
  half_marathon: { icon: Medal, color: "text-teal-500", bgColor: "bg-teal-500/10" },
  marathon: { icon: Award, color: "text-red-500", bgColor: "bg-red-500/10" },
  century_club: { icon: Crown, color: "text-purple-500", bgColor: "bg-purple-500/10" },
  iron_week: { icon: Trophy, color: "text-pink-500", bgColor: "bg-pink-500/10" },
  speed_demon: { icon: Zap, color: "text-green-500", bgColor: "bg-green-500/10" },
  early_bird: { icon: Sunrise, color: "text-cyan-500", bgColor: "bg-cyan-500/10" },
  getting_started: { icon: Sparkles, color: "text-amber-500", bgColor: "bg-amber-500/10" },
  half_century: { icon: Medal, color: "text-indigo-500", bgColor: "bg-indigo-500/10" },
  five_k_club: { icon: Footprints, color: "text-sky-500", bgColor: "bg-sky-500/10" },
  ten_k_club: { icon: Footprints, color: "text-emerald-500", bgColor: "bg-emerald-500/10" },
  trailblazer: { icon: MapPin, color: "text-rose-500", bgColor: "bg-rose-500/10" },
  step_master: { icon: Footprints, color: "text-violet-500", bgColor: "bg-violet-500/10" },
  long_session: { icon: Hourglass, color: "text-fuchsia-500", bgColor: "bg-fuchsia-500/10" },
  calorie_crusher: { icon: Flame, color: "text-red-500", bgColor: "bg-red-500/10" },
  well_rounded: { icon: Sparkles, color: "text-lime-500", bgColor: "bg-lime-500/10" },
  two_week_wonder: { icon: Flame, color: "text-orange-600", bgColor: "bg-orange-600/10" },
};

const DEFAULT_STYLE: BadgeStyle = {
  icon: Trophy,
  color: "text-muted-foreground",
  bgColor: "bg-muted",
};

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
      toast.error(error instanceof Error ? error.message : "Failed to load achievements");
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
        <Skeleton className="mb-6 h-8 w-48" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
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
        <p className="text-muted-foreground mb-4">Sign in to view your achievements</p>
        <UserProfile />
      </div>
    );
  }

  const earnedTypes = new Set(earned.map((a) => a.badgeType));

  return (
    <div className="container mx-auto space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Achievements</h1>
        <p className="text-muted-foreground">
          {earned.length} of {BADGE_DEFINITIONS.length} badges earned
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {BADGE_DEFINITIONS.map((badge) => {
            const isEarned = earnedTypes.has(badge.type);
            const earnedData = earned.find((a) => a.badgeType === badge.type);
            const style = BADGE_STYLES[badge.type] ?? DEFAULT_STYLE;
            const Icon = style.icon;

            return (
              <Card key={badge.type} className={isEarned ? "" : "opacity-50 grayscale"}>
                <CardContent className="flex flex-col items-center space-y-2 p-4 text-center">
                  <div className={`rounded-full p-3 ${isEarned ? style.bgColor : "bg-muted"}`}>
                    {isEarned ? (
                      <Icon className={`h-8 w-8 ${style.color}`} />
                    ) : (
                      <Lock className="text-muted-foreground h-8 w-8" />
                    )}
                  </div>
                  <p className="text-sm font-semibold">{badge.name}</p>
                  <p className="text-muted-foreground text-xs">{badge.description}</p>
                  {isEarned && earnedData && (
                    <p className="text-muted-foreground text-xs">
                      Earned{" "}
                      {new Date(earnedData.earnedAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
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
