'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getFitTrackOwnerId } from '@/firebase/fittrackPartners.firestore';
import {
  ensureWaterLog,
  ensureWaterSettings,
  subscribeWaterLog,
  addWaterIntake,
  removeWaterIntake,
  getRecentWaterLogsForStreak,
} from '@/firebase/water.firestore';
import { useWorkoutStore } from '@/workout/WorkoutContext';
import type { WaterLogDoc, WaterSettings } from '@/types/water';
import {
  getTodayDateKey,
  getDayKeyInTimezone,
  getDailyGoal,
  isGymDay,
  getPaceStatus,
  getNextReminder,
  getScheduleWithStates,
  computeStreakFromDateKeys,
  DEFAULT_TIMEZONE,
} from '@/lib/water/waterUtils';

export function useWaterTracker() {
  const { uid, user } = useAuth();
  const { profile, hydrated: profileHydrated } = useWorkoutStore();

  const effectiveUid = uid ? getFitTrackOwnerId(uid, user) : null;

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

  const nextReminder = useMemo(() => {
    return getNextReminder(schedule, now, timezone, gymDay);
  }, [schedule, now, timezone, gymDay]);

  const scheduleWithStates = useMemo(() => {
    return getScheduleWithStates(schedule, now, timezone, gymDay);
  }, [schedule, now, timezone, gymDay]);

  useEffect(() => {
    const interval = setInterval(() => {
      const today = getTodayDateKey(timezone);
      setDateKey((prev) => (prev !== today ? today : prev));
    }, 60_000);
    return () => clearInterval(interval);
  }, [timezone]);

  useEffect(() => {
    if (!effectiveUid || !profileHydrated) return;

    let cancelled = false;

    async function init() {
      setLoading(true);
      setError(null);
      try {
        const profileNotificationsEnabled = user?.notifyEnabled !== false;
        const s = await ensureWaterSettings(effectiveUid!, timezone, profileNotificationsEnabled);
        if (cancelled) return;
        setSettings(s);

        const todayGoal = weekSchedule
          ? getDailyGoal(weekSchedule, dayKey, s)
          : gymDay
            ? s.dailyGoalGym
            : s.dailyGoalRest;

        await ensureWaterLog(effectiveUid!, dateKey, todayGoal);

        const completedDates = await getRecentWaterLogsForStreak(effectiveUid!, 35);
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
  }, [effectiveUid, profileHydrated, timezone, dateKey, dayKey, weekSchedule, gymDay, user?.notifyEnabled]);

  useEffect(() => {
    if (!effectiveUid) return;

    const unsub = subscribeWaterLog(
      effectiveUid,
      dateKey,
      (data) => setLog(data),
      (err) => setError(err.message)
    );
    return unsub;
  }, [effectiveUid, dateKey]);

  useEffect(() => {
    if (!effectiveUid) return;

    void getRecentWaterLogsForStreak(effectiveUid, 35).then((dates) => {
      setStreak(computeStreakFromDateKeys(dates, dateKey));
    });
  }, [effectiveUid, dateKey, log?.completed]);

  const addIntake = useCallback(
    async (amount: number, note?: string) => {
      if (!effectiveUid) return;
      setActionLoading(true);
      setError(null);
      try {
        await addWaterIntake(effectiveUid, dateKey, amount, note);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to add intake');
        throw err;
      } finally {
        setActionLoading(false);
      }
    },
    [effectiveUid, dateKey]
  );

  const removeIntake = useCallback(
    async (intakeId: string) => {
      if (!effectiveUid) return;
      setActionLoading(true);
      setError(null);
      try {
        await removeWaterIntake(effectiveUid, dateKey, intakeId);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to remove intake');
        throw err;
      } finally {
        setActionLoading(false);
      }
    },
    [effectiveUid, dateKey]
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
    effectiveUid,
  };
}
