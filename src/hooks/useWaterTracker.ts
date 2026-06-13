'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  ensureWaterLog,
  ensureWaterSettings,
  saveWaterSettings,
  subscribeWaterLog,
  addWaterIntake,
  removeWaterIntake,
  getRecentWaterLogsForStreak,
} from '@/firebase/water.firestore';
import { useWorkoutStore } from '@/workout/WorkoutContext';
import type { WaterLogDoc, WaterSettings, WaterScheduleSlot } from '@/types/water';
import { syncWaterReminderSchedule } from '@/services/waterNotificationService';
import {
  getTodayDateKey,
  getDayKeyInTimezone,
  getDailyGoal,
  isGymDay,
  getPaceStatus,
  getNextReminder,
  getScheduleWithStates,
  computeStreakFromDateKeys,
  getCurrentMinutesInTimezone,
  getExpectedMlByTime,
  DEFAULT_TIMEZONE,
} from '@/lib/water/waterUtils';

export function useWaterTracker() {
  const { uid, user } = useAuth();
  const { profile, hydrated: profileHydrated } = useWorkoutStore();

  // Water logs are stored under the signed-in user's uid (not FitTrack owner).
  // Partner-linked accounts write to their own path to avoid permission errors.
  const waterUid = uid;

  const timezone = profile?.timezone || DEFAULT_TIMEZONE;
  const weekSchedule = profile?.weekSchedule;

  const [dateKey, setDateKey] = useState(() => getTodayDateKey(timezone));
  const [settings, setSettings] = useState<WaterSettings | null>(null);
  const [log, setLog] = useState<WaterLogDoc | null>(null);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dayKey = useMemo(
    () => getDayKeyInTimezone(new Date(), timezone),
    [timezone, dateKey]
  );

  const gymDay = useMemo(() => {
    if (!weekSchedule) return false;
    return isGymDay(weekSchedule, dayKey);
  }, [weekSchedule, dayKey]);

  const goalMl = useMemo(() => {
    if (!settings || !weekSchedule) return gymDay ? 3500 : 3000;
    return getDailyGoal(weekSchedule, dayKey, settings);
  }, [settings, weekSchedule, dayKey, gymDay]);

  const now = useMemo(() => new Date(), [dateKey, log?.totalMl]);

  const schedule = settings?.schedule ?? [];

  const paceStatus = useMemo(() => {
    if (!settings) return 'on_track' as const;
    return getPaceStatus(log?.totalMl ?? 0, goalMl, now, schedule, timezone, gymDay);
  }, [log?.totalMl, goalMl, now, schedule, timezone, gymDay, settings]);

  const expectedMl = useMemo(() => {
    if (!settings) return 0;
    const currentMinutes = getCurrentMinutesInTimezone(now, timezone);
    return getExpectedMlByTime(schedule, currentMinutes, gymDay);
  }, [settings, now, timezone, schedule, gymDay]);

  const nextReminder = useMemo(() => {
    return getNextReminder(schedule, now, timezone, gymDay);
  }, [schedule, now, timezone, gymDay]);

  const scheduleWithStates = useMemo(() => {
    return getScheduleWithStates(schedule, now, timezone, gymDay);
  }, [schedule, now, timezone, gymDay]);

  useEffect(() => {
    setDateKey(getTodayDateKey(timezone));
  }, [timezone]);

  useEffect(() => {
    const interval = setInterval(() => {
      const today = getTodayDateKey(timezone);
      setDateKey((prev) => (prev !== today ? today : prev));
    }, 60_000);
    return () => clearInterval(interval);
  }, [timezone]);

  useEffect(() => {
    if (!waterUid || !profileHydrated) return;

    let cancelled = false;

    async function init() {
      setLoading(true);
      setError(null);
      const ownerId = waterUid;
      if (!ownerId) return;
      try {
        const profileNotificationsEnabled = user?.notifyEnabled !== false;
        const s = await ensureWaterSettings(ownerId, timezone, profileNotificationsEnabled);
        if (cancelled) return;
        setSettings(s);

        if (
          s.notificationsEnabled &&
          profileNotificationsEnabled &&
          typeof Notification !== 'undefined' &&
          Notification.permission === 'granted'
        ) {
          await syncWaterReminderSchedule();
        }

        const todayGoal = weekSchedule
          ? getDailyGoal(weekSchedule, dayKey, s)
          : gymDay
            ? s.dailyGoalGym
            : s.dailyGoalRest;

        await ensureWaterLog(ownerId, dateKey, todayGoal);

        const completedDates = await getRecentWaterLogsForStreak(ownerId, 35);
        if (!cancelled) {
          setStreak(computeStreakFromDateKeys(completedDates, dateKey));
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load water tracker');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void init();
    return () => {
      cancelled = true;
    };
  }, [waterUid, profileHydrated, timezone, dateKey, dayKey, weekSchedule, gymDay, user?.notifyEnabled]);

  useEffect(() => {
    if (!waterUid) return;

    const unsub = subscribeWaterLog(
      waterUid,
      dateKey,
      (data) => setLog(data),
      (err) => setError(err.message)
    );
    return unsub;
  }, [waterUid, dateKey]);

  useEffect(() => {
    if (!waterUid) return;

    void getRecentWaterLogsForStreak(waterUid, 35).then((dates) => {
      setStreak(computeStreakFromDateKeys(dates, dateKey));
    });
  }, [waterUid, dateKey, log?.completed]);

  const addIntake = useCallback(
    async (amount: number, note?: string) => {
      if (!waterUid) return;
      setActionLoading(true);
      setError(null);
      try {
        await addWaterIntake(waterUid, dateKey, amount, goalMl, note);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to add intake';
        setError(message);
        throw err;
      } finally {
        setActionLoading(false);
      }
    },
    [waterUid, dateKey, goalMl]
  );

  const removeIntake = useCallback(
    async (intakeId: string) => {
      if (!waterUid) return;
      setActionLoading(true);
      setError(null);
      try {
        await removeWaterIntake(waterUid, dateKey, intakeId);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to remove intake');
        throw err;
      } finally {
        setActionLoading(false);
      }
    },
    [waterUid, dateKey]
  );

  const updateSchedule = useCallback(
    async (newSchedule: WaterScheduleSlot[]) => {
      if (!waterUid) return;
      setActionLoading(true);
      setError(null);
      try {
        await saveWaterSettings(waterUid, { schedule: newSchedule });
        setSettings((prev) => (prev ? { ...prev, schedule: newSchedule } : null));
        await syncWaterReminderSchedule();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update schedule');
        throw err;
      } finally {
        setActionLoading(false);
      }
    },
    [waterUid]
  );

  return {
    totalMl: log?.totalMl ?? 0,
    goalMl,
    intakes: log?.intakes ?? [],
    completed: log?.completed ?? false,
    settings,
    schedule,
    scheduleWithStates,
    paceStatus,
    expectedMl,
    nextReminder,
    streak,
    isGymDay: gymDay,
    timezone,
    dateKey,
    loading: loading || !profileHydrated,
    actionLoading,
    error,
    addIntake,
    removeIntake,
    updateSchedule,
    waterUid,
    ready: !loading && profileHydrated && !!waterUid,
  };
}

