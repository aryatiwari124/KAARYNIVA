import { ArrowUp, ArrowDown, Minus } from "lucide-react";
import { cn } from "@/lib/cn";
import { Card } from "@/components/ui/card";

export interface StatTileProps {
  label: string;
  value: string;
  sublabel?: string;
  /** Fractional change vs the prior period, e.g. 0.12 = +12%. */
  deltaPct?: number | null;
  /** Whether an increase in this metric is good news (revenue) or bad news (expenses). */
  higherIsBetter?: boolean;
}

export function StatTile({ label, value, sublabel, deltaPct, higherIsBetter = true }: StatTileProps) {
  const hasDelta = deltaPct !== undefined && deltaPct !== null && Number.isFinite(deltaPct);
  const isFlat = hasDelta && Math.abs(deltaPct!) < 0.005;
  const isUp = hasDelta && deltaPct! > 0;
  const isGood = hasDelta && !isFlat && (higherIsBetter ? isUp : !isUp);

  return (
    <Card className="p-5">
      <p className="text-sm text-ink-muted">{label}</p>
      <p className="font-display text-2xl font-semibold text-ink mt-1.5 tabular-nums">{value}</p>
      <div className="flex items-center gap-2 mt-2 min-h-5">
        {sublabel && <span className="text-xs text-ink-muted">{sublabel}</span>}
        {hasDelta && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 text-xs font-medium tabular-nums",
              isFlat ? "text-ink-muted" : isGood ? "text-success" : "text-danger"
            )}
          >
            {isFlat ? (
              <Minus className="h-3 w-3" />
            ) : isUp ? (
              <ArrowUp className="h-3 w-3" />
            ) : (
              <ArrowDown className="h-3 w-3" />
            )}
            {Math.abs(deltaPct! * 100).toFixed(1)}%
          </span>
        )}
      </div>
    </Card>
  );
}
