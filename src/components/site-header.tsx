"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Calculator,
  Dumbbell,
  Footprints,
  Target,
  Trophy,
  Bot,
  Utensils,
} from "lucide-react";
import { UserProfile } from "@/components/auth/user-profile";
import { useSession } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { ModeToggle } from "./ui/mode-toggle";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: Activity },
  { href: "/workouts", label: "Workouts", icon: Dumbbell },
  { href: "/meals", label: "Meals", icon: Utensils },
  { href: "/steps", label: "Steps", icon: Footprints },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/achievements", label: "Achievements", icon: Trophy },
  { href: "/calculator", label: "Calculator", icon: Calculator },
  { href: "/chat", label: "AI Coach", icon: Bot },
];

export function SiteHeader() {
  const { data: session } = useSession();
  const pathname = usePathname();

  return (
    <>
      {/* Skip to main content link for accessibility */}
      <a
        href="#main-content"
        className="focus:bg-background focus:text-foreground sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:border focus:px-4 focus:py-2"
      >
        Skip to main content
      </a>
      <header className="border-b" role="banner">
        <nav
          className="container mx-auto flex items-center justify-between px-4 py-4"
          aria-label="Main navigation"
        >
          <div className="flex items-center gap-6">
            <h1 className="text-2xl font-bold">
              <Link
                href="/"
                className="text-primary hover:text-primary/80 flex items-center gap-2 transition-colors"
                aria-label="FitTrack - Go to homepage"
              >
                <div
                  className="bg-primary/10 flex h-8 w-8 items-center justify-center rounded-lg"
                  aria-hidden="true"
                >
                  <Activity className="h-5 w-5" />
                </div>
                <span className="from-primary to-primary/70 bg-gradient-to-r bg-clip-text text-transparent">
                  FitTrack
                </span>
              </Link>
            </h1>

            {/* Nav links for authenticated users */}
            {session && (
              <div className="hidden items-center gap-1 md:flex">
                {NAV_ITEMS.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:text-foreground hover:bg-accent"
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                      <span className="hidden lg:inline">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-center gap-4" role="group" aria-label="User actions">
            <UserProfile />
            <ModeToggle />
          </div>
        </nav>

        {/* Mobile nav for authenticated users */}
        {session && (
          <div className="border-t md:hidden">
            <div className="container mx-auto flex gap-1 overflow-x-auto px-4 py-2">
              {NAV_ITEMS.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <item.icon className="h-3.5 w-3.5" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </header>
    </>
  );
}
