'use client';

import { useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { ChevronLeft, ChevronRight, Clock3 } from 'lucide-react';
import type { UserProfile, WorkoutSession } from '@/workout/types';
import {
  buildYearlyAttendanceMap,
  getLongestStreakForYear,
  type AttendanceKind,
} from '@/workout/utils';
import { cellClass, WEEKDAY_LABELS } from '@/components/fittrack/GymAttendanceCalendar';
import { cn } from '@/lib/utils';

type YearlyCalendarProps = {
  workouts: WorkoutSession[];
  profile: UserProfile;
};

type MonthCell = {
  date: string;
  day: number;
  isCurrentMonth: boolean;
  kind: AttendanceKind;
  isToday: boolean;
};

/** Build the padded Mon–Sun grid cells for a single month (mirrors GymAttendanceCalendar). */
function buildMonthCells(
  monthStart: dayjs.Dayjs,
  attendanceMap: Record<string, AttendanceKind>
): MonthCell[] {
  const monthEnd = monthStart.endOf('month');
  const startOffset = (monthStart.day() + 6) % 7; // Mon=0 … Sun=6 leading pad
  const endOffset = (7 - monthEnd.day()) % 7; // trailing pad to fill last week
  const start = monthStart.subtract(startOffset, 'day');
  const end = monthEnd.add(endOffset, 'day');
  const cells: MonthCell[] = [];

  for (let date = start; date.isBefore(end) || date.isSame(end); date = date.add(1, 'day')) {
    const key = date.format('YYYY-MM-DD');
    cells.push({
      date: key,
      day: date.date(),
      isCurrentMonth: date.month() === monthStart.month(),
      kind: attendanceMap[key] ?? 'none',
      isToday: date.isSame(dayjs(), 'day'),
    });
  }
  return cells;
}

export function YearlyCalendar({ workouts, profile }: YearlyCalendarProps) {
  const [selectedYear, setSelectedYear] = useState(dayjs().year());

  const attendanceMap = useMemo(
    () => buildYearlyAttendanceMap(workouts, selectedYear, profile),
    [workouts, selectedYear, profile]
  );

  const months = useMemo(() => {
    const yearStart = dayjs(`${selectedYear}-01-01`);
    return Array.from({ length: 12 }, (_, m) => {
      const monthStart = yearStart.month(m);
      return {
        key: monthStart.format('YYYY-MM'),
        label: monthStart.format('MMM'),
        cells: buildMonthCells(monthStart, attendanceMap),
      };
    });
  }, [selectedYear, attendanceMap]);

  const summary = useMemo(() => {
    const now = dayjs();
    const yearStart = dayjs(`${selectedYear}-01-01`);
    const yearEnd = dayjs(`${selectedYear}-12-31`);
    const elapsedDays =
      selectedYear === now.year()
        ? Math.max(now.diff(yearStart, 'day') + 1, 1)
        : yearEnd.diff(yearStart, 'day') + 1;

    let gymDays = 0;
    let earlyDays = 0;
    for (const [date, kind] of Object.entries(attendanceMap)) {
      if (dayjs(date).year() !== selectedYear) continue;
      if (kind === 'regular' || kind === 'early') gymDays += 1;
      if (kind === 'early') earlyDays += 1;
    }

    return {
      gymDays,
      earlyDays,
      attendancePercent: Math.round((gymDays / Math.max(elapsedDays, 1)) * 100),
      longestStreak: getLongestStreakForYear(workouts, selectedYear),
    };
  }, [workouts, selectedYear, attendanceMap]);

  return (
    <div className="space-y-5">
      {/* Year selector */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setSelectedYear((y) => y - 1)}
          className="p-2 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 transition-colors"
          aria-label="Previous year"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-lg font-black tabular-nums tracking-wide">{selectedYear}</span>
        <button
          type="button"
          onClick={() => setSelectedYear((y) => y + 1)}
          className="p-2 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 transition-colors"
          aria-label="Next year"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
        <div className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2">Gym Days: {summary.gymDays}</div>
        <div className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2">Early Days: {summary.earlyDays}</div>
        <div className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2">Attendance: {summary.attendancePercent}%</div>
        <div className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2">Best Streak: {summary.longestStreak}d</div>
      </div>

      {/* 12 mini-months */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {months.map((month) => (
          <div key={month.key} className="rounded-2xl border border-border/60 bg-muted/10 p-3">
            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-2">
              {month.label}
            </p>
            <div className="grid grid-cols-7 gap-1 mb-1">
              {WEEKDAY_LABELS.map((day, index) => (
                <div
                  key={`${month.key}-${day}-${index}`}
                  className="text-center text-[7px] font-black uppercase tracking-wider text-muted-foreground/50"
                >
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {month.cells.map((cell) => (
                <div
                  key={cell.date}
                  title={cell.date}
                  className={cn(
                    'aspect-square rounded-md flex items-center justify-center text-[8px] font-black transition-colors',
                    cellClass(cell.kind),
                    !cell.isCurrentMonth && 'opacity-20',
                    cell.isToday && cell.kind === 'none' && 'ring-2 ring-primary/60',
                    cell.isToday && cell.kind !== 'none' && 'ring-2 ring-white/40'
                  )}
                >
                  {cell.day}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 pt-1">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-primary" />
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Gym Day</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Early Gym Day</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-muted border border-border" />
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Rest Day</span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          <Clock3 className="h-3.5 w-3.5" />
          Before {profile.gymTime ?? '12:00'} is early
        </div>
      </div>
    </div>
  );
}
