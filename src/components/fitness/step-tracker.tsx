"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Footprints, Loader2, Pause, Play, Save, Square } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { showNewBadgeToasts } from "@/lib/badge-toast";

type Status = "idle" | "permission-needed" | "tracking" | "paused";

// Step detection tuning. These work well on phones held in hand or pocket.
// We compute the magnitude of acceleration, smooth it on two time scales —
// fast for the step signal, slow for a self-calibrating baseline — then
// peak-detect on the difference. The dynamic baseline matters because some
// Android browsers strip gravity from `accelerationIncludingGravity`, so a
// hardcoded 9.81 baseline never triggers on those devices.
const SMOOTHING = 0.7; // fast low-pass weight on previous value (~50ms τ at 60Hz)
const BASELINE_SMOOTHING = 0.97; // slow rolling mean (~550ms τ at 60Hz)
const STEP_THRESHOLD_MS2 = 0.9; // peak amplitude above dynamic baseline
const MIN_STEP_INTERVAL_MS = 250; // ~240 steps/min ceiling
const STRIDE_M_FALLBACK = 0.75; // average adult stride if profile missing
const KCAL_PER_STEP = 0.04;

interface StepTrackerProps {
  initialTodaySteps: number;
  userHeightCm: number | null;
  userWeightKg: number | null;
  onSaved: () => void;
}

interface MotionPermissionAPI {
  requestPermission?: () => Promise<"granted" | "denied">;
}

function strideMeters(heightCm: number | null): number {
  if (heightCm && heightCm > 50 && heightCm < 250) {
    // 0.43 × height is a common stride approximation for walking
    return (heightCm / 100) * 0.43;
  }
  return STRIDE_M_FALLBACK;
}

function fmtTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function StepTracker({
  initialTodaySteps,
  userHeightCm,
  userWeightKg,
  onSaved,
}: StepTrackerProps) {
  const [status, setStatus] = useState<Status>("idle");
  const [steps, setSteps] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [saving, setSaving] = useState(false);

  // Refs hold values that the motion handler reads without re-rendering.
  const stepsRef = useRef(0);
  const lastStepAtRef = useRef(0);
  const filteredRef = useRef(0);
  const baselineRef = useRef(0);
  const initializedRef = useRef(false);
  const armedRef = useRef(true);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  const stride = strideMeters(userHeightCm);
  const distanceKm = (steps * stride) / 1000;
  const calories = userWeightKg
    ? Math.round((steps * KCAL_PER_STEP * userWeightKg) / 70)
    : Math.round(steps * KCAL_PER_STEP);
  const activeMinutes = Math.round(seconds / 60);
  const projectedTotal = initialTodaySteps + steps;

  const handleMotion = useCallback((event: DeviceMotionEvent) => {
    const a = event.accelerationIncludingGravity;
    if (!a || a.x == null || a.y == null || a.z == null) return;

    const magnitude = Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z);

    // First sample seeds both filters to wherever the device sits, so the
    // baseline doesn't have to drift up from 0 (or down from 9.81) before
    // peaks become detectable.
    if (!initializedRef.current) {
      filteredRef.current = magnitude;
      baselineRef.current = magnitude;
      initializedRef.current = true;
      return;
    }

    filteredRef.current = SMOOTHING * filteredRef.current + (1 - SMOOTHING) * magnitude;
    baselineRef.current =
      BASELINE_SMOOTHING * baselineRef.current + (1 - BASELINE_SMOOTHING) * magnitude;

    const deviation = filteredRef.current - baselineRef.current;
    const now = Date.now();
    const sinceLast = now - lastStepAtRef.current;

    if (armedRef.current && deviation > STEP_THRESHOLD_MS2 && sinceLast > MIN_STEP_INTERVAL_MS) {
      stepsRef.current += 1;
      setSteps(stepsRef.current);
      lastStepAtRef.current = now;
      armedRef.current = false; // require a dip back below threshold before next step
    } else if (deviation < STEP_THRESHOLD_MS2 * 0.4) {
      armedRef.current = true;
    }
  }, []);

  const stopMotion = useCallback(() => {
    window.removeEventListener("devicemotion", handleMotion);
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
    if (wakeLockRef.current) {
      wakeLockRef.current.release().catch(() => {});
      wakeLockRef.current = null;
    }
  }, [handleMotion]);

  const startMotion = useCallback(async () => {
    window.addEventListener("devicemotion", handleMotion);
    if (!tickRef.current) {
      tickRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    }
    // Best-effort screen wake lock
    if ("wakeLock" in navigator) {
      try {
        wakeLockRef.current = await navigator.wakeLock.request("screen");
      } catch {
        // wake lock denied; tracking still runs as long as the user keeps the page in focus
      }
    }
  }, [handleMotion]);

  const start = useCallback(async () => {
    if (typeof window === "undefined") return;
    if (!("DeviceMotionEvent" in window)) {
      toast.error(
        "This device does not expose motion sensors. Use a phone, or log steps manually."
      );
      return;
    }

    // iOS: must request permission from a user gesture
    const dm = DeviceMotionEvent as unknown as MotionPermissionAPI;
    if (typeof dm.requestPermission === "function") {
      try {
        const result = await dm.requestPermission();
        if (result !== "granted") {
          setStatus("permission-needed");
          toast.error("Motion permission denied. Enable it in Safari settings to use the tracker.");
          return;
        }
      } catch {
        toast.error("Could not request motion permission.");
        return;
      }
    }

    await startMotion();
    setStatus("tracking");
  }, [startMotion]);

  const pause = useCallback(() => {
    stopMotion();
    setStatus("paused");
  }, [stopMotion]);

  const resume = useCallback(async () => {
    await startMotion();
    setStatus("tracking");
  }, [startMotion]);

  const save = useCallback(async () => {
    if (steps === 0) {
      toast.error("No steps tracked yet");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/fitness/daily-stats/today/add-steps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          steps,
          distanceKm: parseFloat(distanceKm.toFixed(2)),
          caloriesBurned: calories,
          activeMinutes,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save steps");
      }
      const data = await res.json().catch(() => ({}));
      toast.success(`Added ${steps.toLocaleString()} steps`);
      showNewBadgeToasts(data?.newBadges);
      stepsRef.current = 0;
      lastStepAtRef.current = 0;
      filteredRef.current = 0;
      baselineRef.current = 0;
      initializedRef.current = false;
      armedRef.current = true;
      setSteps(0);
      setSeconds(0);
      stopMotion();
      setStatus("idle");
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save steps");
    } finally {
      setSaving(false);
    }
  }, [steps, distanceKm, calories, activeMinutes, stopMotion, onSaved]);

  const discard = useCallback(() => {
    if (steps > 0 && !confirm(`Discard ${steps.toLocaleString()} tracked steps?`)) {
      return;
    }
    stopMotion();
    stepsRef.current = 0;
    lastStepAtRef.current = 0;
    filteredRef.current = 0;
    baselineRef.current = 0;
    initializedRef.current = false;
    armedRef.current = true;
    setSteps(0);
    setSeconds(0);
    setStatus("idle");
  }, [steps, stopMotion]);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopMotion();
  }, [stopMotion]);

  // Reacquire wake lock if the page becomes visible again while tracking
  useEffect(() => {
    function onVisibility() {
      if (status === "tracking" && document.visibilityState === "visible") {
        if ("wakeLock" in navigator && !wakeLockRef.current) {
          navigator.wakeLock
            .request("screen")
            .then((lock) => {
              wakeLockRef.current = lock;
            })
            .catch(() => {});
        }
      }
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [status]);

  return (
    <div className="space-y-4">
      <div className="bg-card space-y-4 rounded-lg border p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="rounded-full bg-blue-500/10 p-2">
              <Footprints className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="font-semibold">Auto step counter</p>
              <p className="text-muted-foreground text-xs">
                {status === "tracking"
                  ? "Tracking — keep the app open while you walk"
                  : status === "paused"
                    ? "Paused"
                    : "Tap start, then carry your phone as you walk"}
              </p>
            </div>
          </div>
          {status === "tracking" && (
            <span className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              Live
            </span>
          )}
        </div>

        {(status === "tracking" || status === "paused" || steps > 0) && (
          <div className="grid grid-cols-4 gap-3 py-2">
            <Stat label="steps" value={steps.toLocaleString()} highlight />
            <Stat label="time" value={fmtTime(seconds)} />
            <Stat label="km" value={distanceKm.toFixed(2)} />
            <Stat label="kcal" value={calories.toString()} />
          </div>
        )}

        {steps > 0 && (
          <p className="text-muted-foreground text-center text-xs">
            Today total would become{" "}
            <span className="text-foreground font-medium">{projectedTotal.toLocaleString()}</span>{" "}
            after saving
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          {status === "idle" && (
            <Button onClick={start} className="flex-1">
              <Play className="h-4 w-4" />
              Start tracking
            </Button>
          )}
          {status === "tracking" && (
            <>
              <Button onClick={pause} variant="outline" className="flex-1">
                <Pause className="h-4 w-4" />
                Pause
              </Button>
              <Button onClick={save} disabled={saving || steps === 0} className="flex-1">
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save
              </Button>
            </>
          )}
          {status === "paused" && (
            <>
              <Button onClick={resume} className="flex-1">
                <Play className="h-4 w-4" />
                Resume
              </Button>
              <Button onClick={save} disabled={saving || steps === 0} variant="outline">
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save
              </Button>
              <Button onClick={discard} variant="ghost" size="icon" aria-label="Discard">
                <Square className="h-4 w-4" />
              </Button>
            </>
          )}
          {status === "permission-needed" && (
            <Button onClick={start} className="flex-1">
              Enable motion access
            </Button>
          )}
        </div>

        <p className="text-muted-foreground text-[11px] leading-relaxed">
          Best with the phone in your pocket or hand. The page must stay open; accuracy is
          approximate (±10–15%).
        </p>
      </div>
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="text-center">
      <p
        className={
          highlight ? "text-2xl font-bold tabular-nums" : "text-lg font-semibold tabular-nums"
        }
      >
        {value}
      </p>
      <p className="text-muted-foreground text-[11px] tracking-wide uppercase">{label}</p>
    </div>
  );
}
