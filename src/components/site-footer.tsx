import Link from "next/link";
import { Activity } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="text-muted-foreground border-t py-6 text-center text-sm">
      <div className="container mx-auto px-4">
        <div className="flex flex-col items-center space-y-2">
          <div className="flex items-center gap-2">
            <Activity className="text-primary h-4 w-4" />
            <span className="text-foreground font-medium">FitTrack</span>
          </div>
          <p>Your personal fitness tracking companion</p>
          <nav className="flex items-center gap-4 text-xs" aria-label="Legal">
            <Link href="/privacy" className="hover:text-foreground hover:underline">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-foreground hover:underline">
              Terms
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
