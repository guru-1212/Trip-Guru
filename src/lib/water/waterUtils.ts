import type { DayKey, WeekSchedule } from '@/workout/types';
import type {
  NextReminderInfo,
  PaceStatus,
  ScheduleSlotWithState,
  WaterScheduleSlot,
  WaterSettings,
} from '@/types/water';
import {
  DEFAULT_DAILY_GOAL_GYM,
  DEFAULT_DAILY_GOAL_REST,
  DEFAULT_TIMEZONE,
} from '@/types/water';

export {
  DEFAULT_DAILY_GOAL_GYM,
  DEFAULT_DAILY_GOAL_REST,
  DEFAULT_TIMEZONE,
  STREAK_MILESTONES,
} from '@/types/water';

export function getDefaultSchedule(): WaterScheduleSlot[] {
  return [
    { time: '08:00', amountGym: 300, amountRest: 250, label: 'Morning kickstart', note: 'Rehydrate after sleep' },
    { time: '09:30', amountGym: 250, amountRest: 250, label: 'Mid-morning', note: 'Stay ahead of pace' },
    { time: '11:00', amountGym: 300, amountRest: 275, label: 'Pre-lunch', note: 'Digestive support' },
    { time: '12:30', amountGym: 350, amountRest: 300, label: 'Lunch window', note: 'Meal-time hydration' },
    { time: '14:00', amountGym: 300, amountRest: 275, label: 'Afternoon', note: 'Beat the slump' },
    { time: '15:30', amountGym: 500, amountRest: 300, label: 'Pre-workout fuel', note: 'Pre-workout fuel — drink 500 ml' },
    { time: '17:00', amountGym: 400, amountRest: 300, label: 'During workout', note: 'Intra-workout sip' },
    { time: '19:00', amountGym: 450, amountRest: 350, label: 'Post-workout', note: 'Recovery hydration' },
    { time: '20:30', amountGym: 350, amountRest: 300, label: 'Evening', note: 'Wind-down refill' },
    { time: '21:30', amountGym: 300, amountRest: 250, label: 'Night cap', note: 'Final push to goal' },
    { time: '22:30', amountGym: 300, amountRest: 250, label: 'Before bed', note: 'Last sip before sleep' },
  ];
}

export function getDefaultWaterSettings(
  timezone = DEFAULT_TIMEZONE,
  profileNotificationsEnabled = false
): WaterSettings {
  return {
    dailyGoalRest: DEFAULT_DAILY_GOAL_REST,
    dailyGoalGym: DEFAULT_DAILY_GOAL_GYM,
    notificationsEnabled: profileNotificationsEnabled,
    waterRemindersOptOut: false,
    timezone,
    schedule: getDefaultSchedule(),
  };
}

/** Inherit profile notification opt-in unless user opted out of water reminders. */
export function resolveWaterNotificationsEnabled(
  settings: Pick<WaterSettings, 'notificationsEnabled' | 'waterRemindersOptOut'>,
  profileNotificationsEnabled: boolean
): boolean {
  if (settings.waterRemindersOptOut) return false;
  if (settings.notificationsEnabled) return true;
  return profileNotificationsEnabled;
}

export function getLocalDateString(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function getDayKeyInTimezone(date: Date, timeZone: string): DayKey {
  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
  }).format(date);
  const map: Record<string, DayKey> = {
    Mon: 'Mon',
    Tue: 'Tue',
    Wed: 'Wed',
    Thu: 'Thu',
    Fri: 'Fri',
    Sat: 'Sat',
    Sun: 'Sun',
  };
  return map[weekday] ?? 'Mon';
}

export function getTodayDateKey(timezone: string): string {
  return getLocalDateString(new Date(), timezone);
}

export function isGymDay(weekSchedule: WeekSchedule, dayKey: DayKey): boolean {
  return weekSchedule[dayKey] !== 'rest';
}

export function getDailyGoal(
  weekSchedule: WeekSchedule,
  dayKey: DayKey,
  settings: Pick<WaterSettings, 'dailyGoalGym' | 'dailyGoalRest'>
): number {
  return isGymDay(weekSchedule, dayKey) ? settings.dailyGoalGym : settings.dailyGoalRest;
}

export function getSlotAmount(slot: WaterScheduleSlot, gymDay: boolean): number {
  return gymDay ? slot.amountGym : slot.amountRest;
}

export function formatMl(ml: number): string {
  if (ml >= 1000) {
    const liters = ml / 1000;
    return liters % 1 === 0 ? `${liters} L` : `${liters.toFixed(1)} L`;
  }
  return `${ml} ml`;
}

function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(':').map((x) => parseInt(x, 10));
  return h * 60 + m;
}

export function getCurrentMinutesInTimezone(date: Date, timeZone: string): number {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = Object.fromEntries(
    fmt
      .formatToParts(date)
      .filter((p) => p.type !== 'literal')
      .map((p) => [p.type, p.value])
  );
  const hour = parseInt(parts.hour === '24' ? '0' : parts.hour, 10);
  const minute = parseInt(parts.minute, 10);
  return hour * 60 + minute;
}

export function getExpectedMlByTime(
  schedule: WaterScheduleSlot[],
  currentMinutes: number,
  gymDay: boolean
): number {
  let expected = 0;
  for (const slot of schedule) {
    const slotMinutes = parseTimeToMinutes(slot.time);
    if (slotMinutes <= currentMinutes) {
      expected += getSlotAmount(slot, gymDay);
    }
  }
  return expected;
}

export function getPaceStatus(
  totalMl: number,
  goalMl: number,
  currentTime: Date,
  schedule: WaterScheduleSlot[],
  timezone: string,
  gymDay: boolean
): PaceStatus {
  const currentMinutes = getCurrentMinutesInTimezone(currentTime, timezone);
  const wakeMinutes = parseTimeToMinutes('08:00');
  const sleepMinutes = parseTimeToMinutes('23:00');

  if (currentMinutes < wakeMinutes) {
    return totalMl > 0 ? 'ahead' : 'on_track';
  }
  if (currentMinutes >= sleepMinutes) {
    return totalMl >= goalMl ? 'ahead' : totalMl >= goalMl * 0.85 ? 'on_track' : 'behind';
  }

  const expected = getExpectedMlByTime(schedule, currentMinutes, gymDay);
  const ratio = expected > 0 ? totalMl / expected : totalMl > 0 ? 1 : 0;

  if (ratio >= 1.05) return 'ahead';
  if (ratio >= 0.85) return 'on_track';
  return 'behind';
}

export function getScheduleWithStates(
  schedule: WaterScheduleSlot[],
  currentTime: Date,
  timezone: string,
  gymDay: boolean
): ScheduleSlotWithState[] {
  const currentMinutes = getCurrentMinutesInTimezone(currentTime, timezone);
  let nextIndex = schedule.findIndex((s) => parseTimeToMinutes(s.time) > currentMinutes);

  if (nextIndex === -1) {
    return schedule.map((slot) => ({
      ...slot,
      amount: getSlotAmount(slot, gymDay),
      state: 'done' as const,
    }));
  }

  return schedule.map((slot, index) => {
    const amount = getSlotAmount(slot, gymDay);
    let state: ScheduleSlotWithState['state'];
    if (index < nextIndex) {
      state = 'done';
    } else if (index === nextIndex) {
      state = 'next';
    } else {
      state = 'upcoming';
    }
    return { ...slot, amount, state };
  });
}

export function getNextReminder(
  schedule: WaterScheduleSlot[],
  currentTime: Date,
  timezone: string,
  gymDay: boolean
): NextReminderInfo {
  const currentMinutes = getCurrentMinutesInTimezone(currentTime, timezone);
  const withStates = getScheduleWithStates(schedule, currentTime, timezone, gymDay);
  const nextSlot = withStates.find((s) => s.state === 'next') ?? null;

  if (!nextSlot) {
    return { slot: null, minutesUntil: null };
  }

  const slotMinutes = parseTimeToMinutes(nextSlot.time);
  const minutesUntil = slotMinutes - currentMinutes;
  return { slot: nextSlot, minutesUntil: Math.max(0, minutesUntil) };
}

export function computeStreak(completedDates: string[]): number {
  if (completedDates.length === 0) return 0;

  const sorted = [...completedDates].sort().reverse();
  let streak = 0;
  const today = sorted[0];
  const checkDate = new Date(today + 'T12:00:00');

  for (let i = 0; i < sorted.length; i++) {
    const expected = getLocalDateString(checkDate, 'UTC');
    const actual = sorted[i];
    const expectedKey = expected.slice(0, 10);

    if (actual !== expectedKey && i === 0) {
      checkDate.setDate(checkDate.getDate() - 1);
      const yesterdayKey = getLocalDateString(checkDate, 'UTC');
      if (actual !== yesterdayKey) return 0;
    }

    if (actual === getLocalDateString(checkDate, 'UTC').slice(0, 10)) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

export function computeStreakFromDateKeys(completedDateKeys: string[], todayKey: string): number {
  const set = new Set(completedDateKeys);
  if (set.size === 0) return 0;

  let streak = 0;
  const cursor = new Date(todayKey + 'T12:00:00Z');

  if (!set.has(todayKey)) {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  while (true) {
    const key = cursor.toISOString().slice(0, 10);
    if (!set.has(key)) break;
    streak++;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  return streak;
}

export function formatTimeDisplay(time: string): string {
  const [h, m] = time.split(':').map((x) => parseInt(x, 10));
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${m.toString().padStart(2, '0')} ${period}`;
}

export function getIntakeTimeDisplay(isoOrTime: string, timezone: string): string {
  if (isoOrTime.includes('T')) {
    const d = new Date(isoOrTime);
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(d);
  }
  return formatTimeDisplay(isoOrTime);
}

export function getProgressPercent(totalMl: number, goalMl: number): number {
  if (goalMl <= 0) return 0;
  return Math.min(100, Math.round((totalMl / goalMl) * 100));
}
