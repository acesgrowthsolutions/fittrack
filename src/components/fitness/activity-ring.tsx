import { cn } from "@/lib/utils";

interface ActivityRingProps {
  /** Progress value from 0 to 100 */
  value: number;
  /** Diameter of the SVG in pixels */
  size?: number;
  /** Stroke width for the ring */
  strokeWidth?: number;
  /** Tailwind color class for the active ring (e.g. "text-blue-500") */
  color?: string;
  /** Main label shown in the center (e.g. "8,432") */
  label?: string;
  /** Sublabel shown below the label (e.g. "steps") */
  sublabel?: string;
}

export function ActivityRing({
  value,
  size = 120,
  strokeWidth = 10,
  color = "text-blue-500",
  label,
  sublabel,
}: ActivityRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedValue = Math.min(Math.max(value, 0), 100);
  const strokeDashoffset = circumference - (clampedValue / 100) * circumference;

  return (
    <div className="relative flex flex-col items-center gap-1">
      <svg
        width={size}
        height={size}
        className="-rotate-90 transform"
        aria-label={`${clampedValue}% progress`}
        role="img"
      >
        {/* Background ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/30"
        />
        {/* Progress ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className={cn("transition-all duration-700 ease-out", color)}
        />
      </svg>
      {/* Center text overlay */}
      {(label || sublabel) && (
        <div
          className="absolute flex flex-col items-center justify-center"
          style={{ width: size, height: size }}
        >
          {label && <span className="text-lg leading-tight font-bold">{label}</span>}
          {sublabel && <span className="text-muted-foreground text-xs">{sublabel}</span>}
        </div>
      )}
    </div>
  );
}
