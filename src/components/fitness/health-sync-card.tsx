"use client";

import { useCallback, useEffect, useState } from "react";
import { Apple, Link2, Link2Off, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface HealthIntegrationStatus {
  connected: boolean;
  status?: "active" | "disconnected";
  source?: string | null;
  connectedAt?: string | null;
  lastSyncAt?: string | null;
}

// Maps Terra's provider codes (APPLE, GOOGLE, FITBIT, …) to a human label.
// Anything not in the map renders as title-cased Terra code, so a new
// provider doesn't break the UI — it just looks less polished.
const SOURCE_LABELS: Record<string, string> = {
  APPLE: "Apple Health",
  GOOGLE: "Google Fit / Health Connect",
  FITBIT: "Fitbit",
  GARMIN: "Garmin",
  OURA: "Oura",
  WHOOP: "Whoop",
};

function formatSource(source: string | null | undefined): string {
  if (!source) return "your health app";
  return SOURCE_LABELS[source] ?? source.charAt(0) + source.slice(1).toLowerCase();
}

function formatLastSync(iso: string | null | undefined): string {
  if (!iso) return "never";
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "never";
  const diffMs = Date.now() - then;
  const mins = Math.round(diffMs / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.round(hrs / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

interface HealthSyncCardProps {
  onConnectionChange?: (connected: boolean) => void;
}

export function HealthSyncCard({ onConnectionChange }: HealthSyncCardProps) {
  const [status, setStatus] = useState<HealthIntegrationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/integrations/terra");
      if (!res.ok) {
        // 503 = not configured. Render a permanent "coming soon" state
        // instead of an error toast — most users won't have keys set yet.
        if (res.status === 503) {
          setStatus({ connected: false });
          return;
        }
        throw new Error("Failed to load integration status");
      }
      const data = (await res.json()) as HealthIntegrationStatus;
      setStatus(data);
      onConnectionChange?.(data.connected);
    } catch (err) {
      console.error(err);
      setStatus({ connected: false });
    } finally {
      setLoading(false);
    }
  }, [onConnectionChange]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const connect = useCallback(async () => {
    setConnecting(true);
    try {
      const res = await fetch("/api/integrations/terra/connect", { method: "POST" });
      if (res.status === 503) {
        toast.error(
          "Health sync isn't set up yet. Ask your admin to provision Terra API keys."
        );
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? "Failed to start connection");
      }
      const data = (await res.json()) as { url: string };
      window.location.href = data.url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to start connection");
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    if (!confirm("Disconnect your health app? Steps will stop syncing automatically.")) {
      return;
    }
    setDisconnecting(true);
    try {
      const res = await fetch("/api/integrations/terra", { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to disconnect");
      toast.success("Health app disconnected");
      await fetchStatus();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to disconnect");
    } finally {
      setDisconnecting(false);
    }
  }, [fetchStatus]);

  if (loading) {
    return (
      <div className="bg-card flex items-center gap-3 rounded-lg border p-6">
        <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
        <p className="text-muted-foreground text-sm">Loading health sync status…</p>
      </div>
    );
  }

  if (status?.connected) {
    const source = formatSource(status.source);
    return (
      <div className="bg-card space-y-3 rounded-lg border p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-emerald-500/10 p-2">
              <Apple className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="font-semibold">Synced with {source}</p>
              <p className="text-muted-foreground text-xs">
                Steps update automatically — no need to keep the app open.
              </p>
              <p className="text-muted-foreground mt-1 flex items-center gap-1.5 text-xs">
                <RefreshCw className="h-3 w-3" />
                Last sync {formatLastSync(status.lastSyncAt)}
              </p>
            </div>
          </div>
          <Button
            onClick={disconnect}
            disabled={disconnecting}
            variant="outline"
            size="sm"
          >
            {disconnecting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Link2Off className="h-4 w-4" />
            )}
            Disconnect
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card space-y-4 rounded-lg border p-6">
      <div className="flex items-center gap-3">
        <div className="rounded-full bg-emerald-500/10 p-2">
          <Apple className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div>
          <p className="font-semibold">Sync with Apple Health or Google Fit</p>
          <p className="text-muted-foreground text-xs">
            <span className="text-foreground font-medium">No watch needed</span> —
            your iPhone or Android already counts steps with its built-in motion
            chip. A wearable (Fitbit, Garmin, Whoop, Oura) just adds heart-rate
            and workout detail if you have one.
          </p>
        </div>
      </div>
      <Button onClick={connect} disabled={connecting} className="w-full sm:w-auto">
        {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
        Connect health app
      </Button>
      <p className="text-muted-foreground border-t pt-3 text-xs">
        Don&apos;t want to connect? You can also leave the in-browser tracker
        below running while you walk, or tap{" "}
        <span className="text-foreground font-medium">Edit manually</span> at the
        top of this page to type in a step count.
      </p>
    </div>
  );
}
