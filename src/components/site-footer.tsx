import { Activity } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="border-t py-6 text-center text-sm text-muted-foreground">
      <div className="container mx-auto px-4">
        <div className="flex flex-col items-center space-y-2">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <span className="font-medium text-foreground">FitTrack</span>
          </div>
          <p>Your personal fitness tracking companion</p>
        </div>
      </div>
    </footer>
  );
}
