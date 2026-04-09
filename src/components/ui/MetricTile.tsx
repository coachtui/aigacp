import React from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface Delta {
  value:     number;
  direction: "up" | "down" | "neutral";
  label?:    string;
}

interface MetricTileProps {
  label:        string;
  value:        number | string;
  delta?:       Delta;
  accentColor?: "gold" | "teal" | "blue" | "red" | "green";
  className?:   string;
}

const ACCENT_VALUE_CLASS: Record<NonNullable<MetricTileProps["accentColor"]>, string> = {
  gold:  "text-gold",
  teal:  "text-teal",
  blue:  "text-blue-brand",
  red:   "text-status-critical",
  green: "text-status-success",
};

export function MetricTile({ label, value, delta, accentColor, className = "" }: MetricTileProps) {
  const valueClass = accentColor
    ? ACCENT_VALUE_CLASS[accentColor]
    : "text-content-primary";

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <span className="text-[11px] font-semibold uppercase tracking-widest text-content-muted">{label}</span>
      <span className={`text-3xl font-bold tabular-nums leading-none ${valueClass}`}>{value}</span>
      {delta && (
        <div className={`flex items-center gap-1 text-xs font-medium ${
          delta.direction === "up"      ? "text-status-success"  :
          delta.direction === "down"    ? "text-status-critical" :
          "text-content-muted"
        }`}>
          {delta.direction === "up"      && <TrendingUp   size={12} />}
          {delta.direction === "down"    && <TrendingDown size={12} />}
          {delta.direction === "neutral" && <Minus        size={12} />}
          <span>{delta.value > 0 ? "+" : ""}{delta.value} {delta.label ?? ""}</span>
        </div>
      )}
    </div>
  );
}
