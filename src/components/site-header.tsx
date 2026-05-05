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
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-background focus:text-foreground focus:border focus:rounded-md"
      >
        Skip to main content
      </a>
      <header className="border-b" role="banner">
        <nav
          className="container mx-auto px-4 py-4 flex justify-between items-center"
          aria-label="Main navigation"
        >
          <div className="flex items-center gap-6">
            <h1 className="text-2xl font-bold">
              <Link
                href="/"
                className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors"
                aria-label="FitTrack - Go to homepage"
              >
                <div
                  className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10"
                  aria-hidden="true"
                >
                  <Activity className="h-5 w-5" />
                </div>
                <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                  FitTrack
                </span>
              </Link>
            </h1>

            {/* Nav links for authenticated users */}
            {session && (
              <div className="hidden md:flex items-center gap-1">
                {NAV_ITEMS.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
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

          <div
            className="flex items-center gap-4"
            role="group"
            aria-label="User actions"
          >
            <UserProfile />
            <ModeToggle />
          </div>
        </nav>

        {/* Mobile nav for authenticated users */}
        {session && (
          <div className="md:hidden border-t">
            <div className="container mx-auto px-4 py-2 flex gap-1 overflow-x-auto">
              {NAV_ITEMS.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors",
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
