'use client';

import { useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { ChevronLeft, ChevronRight, Clock3 } from 'lucide-react';
import type { UserProfile, WorkoutSession } from '@/workout/types';
import { buildYearlyAttendanceMap, getLongestStreakForYear, type AttendanceKind } from '@/workout/utils';
import { cn } from '@/lib/utils';

type GymAttendanceCalendarProps = {
  workouts: WorkoutSession[];
  profile: UserProfile;
};

type CalendarCell = {
  date: string;
  day: number;
  isCurrentMonth: boolean;
  kind: AttendanceKind;
  isToday: boolean;
};

type YearCell = {
  date: string;
  kind: AttendanceKind;
  isCurrentYear: boolean;
  isToday: boolean;
  workoutCount: number;
};

const WEEKDAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function cellClass(kind: AttendanceKind): string {
  if (kind === 'early') return 'bg-amber-400 text-amber-950 shadow-sm shadow-amber-400/20';
  if (kind === 'regular') return 'bg-primary text-white shadow-md shadow-primary/25';
  return 'bg-muted/50 text-muted-foreground/40 border border-transparent';
}

export function GymAttendanceCalendar({ workouts, profile }: GymAttendanceCalendarProps) {
  const [mode, setMode] = useState<'month' | 'year'>('month');
  const [selectedYear, setSelectedYear] = useState(dayjs().year());
  const [selectedMonth, setSelectedMonth] = useState(() => dayjs().startOf('month'));

  // In month mode the attendance data must cover the selected month's year.
  const activeYear = mode === 'month' ? selectedMonth.year() : selectedYear;

  const attendanceByYear = useMemo(
    () => buildYearlyAttendanceMap(workouts, activeYear, profile),
    [workouts, activeYear, profile]
  );

  const workoutCountByDate = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const workout of workouts) {
      counts[workout.date] = (counts[workout.date] ?? 0) + 1;
    }
    return counts;
  }, [workouts]);

  const monthCells = useMemo<CalendarCell[]>(() => {
    const monthStart = selectedMonth.startOf('month');
    const monthEnd = selectedMonth.endOf('month');
    const startOffset = (monthStart.day() + 6) % 7;
    const endOffset = (7 - monthEnd.day()) % 7;
    const start = monthStart.subtract(startOffset, 'day');
    const end = monthEnd.add(endOffset, 'day');
    const cells: CalendarCell[] = [];

    for (let date = start; date.isBefore(end) || date.isSame(end); date = date.add(1, 'day')) {
      const key = date.format('YYYY-MM-DD');
      cells.push({
        date: key,
        day: date.date(),
        isCurrentMonth: date.month() === monthStart.month(),
        kind: attendanceByYear[key] ?? 'none',
        isToday: date.isSame(dayjs(), 'day'),
      });
    }
    return cells;
  }, [attendanceByYear, selectedMonth]);

  // Gym / early counts for the selected month (shown in the month header).
  const monthSummary = useMemo(() => {
    let gymDays = 0;
    let earlyDays = 0;
    for (const [date, kind] of Object.entries(attendanceByYear)) {
      if (!dayjs(date).isSame(selectedMonth, 'month')) continue;
      if (kind === 'regular' || kind === 'early') gymDays += 1;
      if (kind === 'early') earlyDays += 1;
    }
    return { gymDays, earlyDays };
  }, [attendanceByYear, selectedMonth]);

  const yearCells = useMemo<YearCell[]>(() => {
    const yearStart = dayjs(`${selectedYear}-01-01`);
    const yearEnd = dayjs(`${selectedYear}-12-31`);
    const startOffset = (yearStart.day() + 6) % 7;
    const endOffset = (7 - yearEnd.day()) % 7;
    const start = yearStart.subtract(startOffset, 'day');
    const end = yearEnd.add(endOffset, 'day');
    const cells: YearCell[] = [];

    for (let date = start; date.isBefore(end) || date.isSame(end); date = date.add(1, 'day')) {
      const key = date.format('YYYY-MM-DD');
      cells.push({
        date: key,
        kind: attendanceByYear[key] ?? 'none',
        isCurrentYear: date.year() === selectedYear,
        isToday: date.isSame(dayjs(), 'day'),
        workoutCount: workoutCountByDate[key] ?? 0,
      });
    }
    return cells;
  }, [selectedYear, attendanceByYear, workoutCountByDate]);

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
    for (const [date, kind] of Object.entries(attendanceByYear)) {
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
  }, [workouts, selectedYear, attendanceByYear]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 p-1 rounded-xl bg-muted/30 border border-border/50">
          <button
            type="button"
            onClick={() => setMode('month')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all',
              mode === 'month' ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Month
          </button>
          <button
            type="button"
            onClick={() => setMode('year')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all',
              mode === 'year' ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Year
          </button>
        </div>

        {mode === 'month' ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedMonth((month) => month.subtract(1, 'month'))}
              className="p-2 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 transition-colors"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-3 py-1.5 rounded-full border border-border bg-muted/40">
              {selectedMonth.format('MMMM YYYY')} - {monthSummary.gymDays} days - {monthSummary.earlyDays} early
            </span>
            <button
              type="button"
              onClick={() => setSelectedMonth((month) => month.add(1, 'month'))}
              className="p-2 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 transition-colors"
              aria-label="Next month"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedYear((year) => year - 1)}
              className="p-2 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 transition-colors"
              aria-label="Previous year"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-3 py-1.5 rounded-full border border-border bg-muted/40">
              {selectedYear} - {summary.gymDays} days - {summary.earlyDays} early
            </span>
            <button
              type="button"
              onClick={() => setSelectedYear((year) => year + 1)}
              className="p-2 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 transition-colors"
              aria-label="Next year"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      <div className={cn('grid grid-cols-7 gap-1.5', mode === 'month' && 'mb-2')}>
        {WEEKDAY_LABELS.map((day, index) => (
          <div key={`${day}-${index}`} className="text-center text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">
            {day}
          </div>
        ))}
      </div>

      {mode === 'month' ? (
        <div className="grid grid-cols-7 gap-1.5">
          {monthCells.map((cell) => (
            <div
              key={cell.date}
              title={cell.date}
              className={cn(
                'aspect-square rounded-xl flex items-center justify-center text-[10px] font-black transition-all duration-300',
                cellClass(cell.kind),
                !cell.isCurrentMonth && 'opacity-20',
                cell.isToday && cell.kind === 'none' && 'ring-2 ring-primary/60 ring-offset-2 ring-offset-background border-primary/20',
                cell.isToday && cell.kind !== 'none' && 'ring-2 ring-white/30 ring-offset-2 ring-offset-primary'
              )}
            >
              {cell.day}
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-[repeat(53,minmax(0,1fr))] gap-1 overflow-x-auto pb-1">
            {Array.from({ length: 53 }, (_, weekIndex) => (
              <div key={`week-${weekIndex}`} className="grid grid-rows-7 gap-1">
                {yearCells.slice(weekIndex * 7, weekIndex * 7 + 7).map((cell) => (
                  <div
                    key={cell.date}
                    title={`${cell.date}${cell.workoutCount ? ` - ${cell.workoutCount} session${cell.workoutCount === 1 ? '' : 's'}` : ' - Rest day'}`}
                    className={cn(
                      'h-3 w-3 rounded-[4px] transition-all',
                      cellClass(cell.kind),
                      !cell.isCurrentYear && 'opacity-20',
                      cell.isToday && 'ring-2 ring-primary/60 ring-offset-2 ring-offset-background'
                    )}
                  />
                ))}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            <div className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2">Gym Days: {summary.gymDays}</div>
            <div className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2">Early Days: {summary.earlyDays}</div>
            <div className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2">Attendance: {summary.attendancePercent}%</div>
            <div className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2">Best Streak: {summary.longestStreak}d</div>
          </div>
        </>
      )}

      <div className="flex flex-wrap items-center gap-4 pt-2">
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
