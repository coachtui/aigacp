"use client";

import React, { useMemo } from "react";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import type { PourEvent } from "@/lib/ops/types";
import { POUR_STATUS } from "@/lib/ops/pourRules";

// ── Constants ─────────────────────────────────────────────────────────────────

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** Max event chips shown per day before "+X more" truncation. */
const MAX_VISIBLE = 3;

// ── Types ─────────────────────────────────────────────────────────────────────

interface PourCalendarProps {
  /** Full pours list — component filters to Approved only internally. */
  pours:       PourEvent[];
  onPourClick: (pour: PourEvent) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function PourCalendar({ pours, onPourClick }: PourCalendarProps) {
  const now = new Date();

  const [year,  setYear]  = React.useState(now.getFullYear());
  const [month, setMonth] = React.useState(now.getMonth()); // 0-indexed

  // ── Filter to Approved pours ──────────────────────────────────────────────
  const approvedPours = useMemo(
    () => pours.filter((p) => p.status === POUR_STATUS.APPROVED),
    [pours],
  );

  // ── Build date → pour[] index ─────────────────────────────────────────────
  const poursByDate = useMemo<Record<string, PourEvent[]>>(() => {
    const map: Record<string, PourEvent[]> = {};
    for (const pour of approvedPours) {
      (map[pour.date] ??= []).push(pour);
    }
    // Sort each day's pours by time ascending
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => a.time.localeCompare(b.time));
    }
    return map;
  }, [approvedPours]);

  // ── Build calendar grid ───────────────────────────────────────────────────
  const { cells, totalRows } = useMemo(() => {
    const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 = Sun
    const daysInMonth    = new Date(year, month + 1, 0).getDate();

    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDayOfWeek; i++) cells.push(null); // leading pad
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);             // trailing pad

    return { cells, totalRows: cells.length / 7 };
  }, [year, month]);

  // ── Today key for highlight ───────────────────────────────────────────────
  const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();

  // ── Navigation ────────────────────────────────────────────────────────────
  function prevMonth() {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  }

  function nextMonth() {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  }

  function goToday() {
    setYear(now.getFullYear());
    setMonth(now.getMonth());
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="bg-surface-raised border border-surface-border rounded-[var(--radius-card)] overflow-hidden shadow-[var(--shadow-card)]">

      {/* ── Calendar header ────────────────────────────────────────────────── */}
      <div className="px-5 py-3 border-b border-surface-border flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={prevMonth}
            aria-label="Previous month"
            className="p-1 rounded-lg text-content-muted hover:text-content-primary hover:bg-surface-overlay transition-colors"
          >
            <ChevronLeft size={15} />
          </button>
          <span className="text-sm font-bold text-content-primary min-w-[155px] text-center">
            {MONTH_NAMES[month]} {year}
          </span>
          <button
            onClick={nextMonth}
            aria-label="Next month"
            className="p-1 rounded-lg text-content-muted hover:text-content-primary hover:bg-surface-overlay transition-colors"
          >
            <ChevronRight size={15} />
          </button>
        </div>

        <div className="flex items-center gap-3">
          {!isCurrentMonth && (
            <button
              onClick={goToday}
              className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-surface-border text-content-secondary hover:border-gold/30 hover:text-gold transition-colors"
            >
              Today
            </button>
          )}
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-sm bg-gold/10 border border-gold/30 shrink-0" />
            <span className="text-[10px] text-content-muted">Approved pours</span>
          </div>
        </div>
      </div>

      {/* ── Day-of-week labels ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-7 border-b border-surface-border">
        {DAY_LABELS.map((label) => (
          <div
            key={label}
            className="py-2 text-center text-[10px] font-bold uppercase tracking-widest text-content-muted border-r border-surface-border last:border-r-0"
          >
            {label}
          </div>
        ))}
      </div>

      {/* ── Grid ──────────────────────────────────────────────────────────── */}
      <div
        className="grid grid-cols-7 border-l border-t border-surface-border"
        style={{ gridTemplateRows: `repeat(${totalRows}, minmax(88px, auto))` }}
      >
        {cells.map((day, idx) => {
          if (day === null) {
            return (
              <div
                key={idx}
                className="border-r border-b border-surface-border bg-surface-overlay/40"
              />
            );
          }

          const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const dayPours  = poursByDate[dateKey] ?? [];
          const isToday   = dateKey === todayKey;
          const visible   = dayPours.slice(0, MAX_VISIBLE);
          const overflow  = dayPours.length - MAX_VISIBLE;

          return (
            <div
              key={idx}
              className="border-r border-b border-surface-border p-1.5 flex flex-col gap-1"
            >
              {/* Day number */}
              <div className="flex justify-end">
                <span
                  className={`text-[11px] font-semibold w-5 h-5 flex items-center justify-center rounded-full shrink-0 ${
                    isToday
                      ? "bg-gold text-content-inverse"
                      : "text-content-secondary"
                  }`}
                >
                  {day}
                </span>
              </div>

              {/* Event chips */}
              {visible.map((pour) => (
                <button
                  key={pour.id}
                  onClick={() => onPourClick(pour)}
                  className="w-full text-left rounded px-1.5 py-0.5 bg-gold/10 border border-gold/20 hover:bg-gold/20 hover:border-gold/40 transition-colors"
                  title={`${pour.time} · ${pour.location} · ${pour.pourType}`}
                >
                  <div className="flex items-center gap-1 min-w-0">
                    <Clock size={9} className="shrink-0 text-gold" />
                    <span className="text-[10px] font-semibold text-gold truncate">{pour.time}</span>
                  </div>
                  <p className="text-[10px] text-content-secondary truncate leading-tight">{pour.location}</p>
                  <p className="text-[9px] text-content-muted truncate leading-tight">{pour.pourType}</p>
                </button>
              ))}

              {/* Overflow count */}
              {overflow > 0 && (
                <span className="text-[9px] font-semibold text-content-muted pl-1">
                  +{overflow} more
                </span>
              )}
            </div>
          );
        })}
      </div>

      {approvedPours.length === 0 && (
        <div className="px-5 py-6 text-center text-xs text-content-muted border-t border-surface-border">
          No approved pours to display.
        </div>
      )}
    </div>
  );
}
