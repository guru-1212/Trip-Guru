'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useWorkoutStore } from '@/workout/WorkoutContext';
import {
  addNutritionEntry,
  ensureNutritionLog,
  ensureNutritionSettings,
  getCustomFoods,
  getNutritionStreak,
  getRecentNutritionLogs,
  removeNutritionEntry,
  saveCustomFood,
  subscribeNutritionLog,
  updateNutritionEntry,
} from '@/firebase/nutrition.firestore';
import {
  computeCoverage,
  computeNutritionTargets,
  computeWeightProjection,
  isNutritionGoalMet,
  scaleNutrients,
  sumNutrients,
} from '@/lib/nutrition/nutritionCalculators';
import { getLoggedFoodIds, getNutritionSuggestions } from '@/lib/nutrition/nutritionSuggestions';
import { getTodayDateKey, shiftDateKey } from '@/lib/nutrition/nutritionUtils';
import type { DietImportLogPayload } from '@/types/dietImport';
import type { FoodItem, MealSlot, NutrientsPerServing, NutritionLogEntry } from '@/types/nutrition';
import { EMPTY_NUTRIENTS } from '@/types/nutrition';
import type { NutritionSettings } from '@/types/nutrition';
import { DEFAULT_TIMEZONE } from '@/types/water';

export function useDietTracker() {
  const { uid } = useAuth();
  const { profile, hydrated: profileHydrated, bodyStats, weeklyGoals } = useWorkoutStore();

  const timezone = profile?.timezone || DEFAULT_TIMEZONE;
  const [dateKey, setDateKey] = useState(() => getTodayDateKey(timezone));
  const [settings, setSettings] = useState<NutritionSettings | null>(null);
  const [log, setLog] = useState<Awaited<ReturnType<typeof ensureNutritionLog>> | null>(null);
  const [customFoods, setCustomFoods] = useState<FoodItem[]>([]);
  const [weeklyLogs, setWeeklyLogs] = useState<
    Awaited<ReturnType<typeof getRecentNutritionLogs>>
  >([]);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initGenRef = useRef(0);

  const currentWeight = useMemo(() => {
    const sorted = [...bodyStats].sort((a, b) => b.date.localeCompare(a.date));
    return sorted[0]?.weight ?? profile?.weight ?? 70;
  }, [bodyStats, profile?.weight]);

  const nutritionTargets = useMemo(() => {
    return computeNutritionTargets(
      profile,
      settings?.gainPace ?? 'moderate',
      settings?.targetWeightKg ?? weeklyGoals?.targetWeight ?? profile.weight + 5,
      settings?.overrides
    );
  }, [
    profile,
    settings?.gainPace,
    settings?.targetWeightKg,
    settings?.overrides,
    weeklyGoals?.targetWeight,
  ]);

  const targetNutrients = useMemo((): NutrientsPerServing => {
    const { targetWeightKg, currentWeightKg, ...nutrients } = nutritionTargets;
    void targetWeightKg;
    void currentWeightKg;
    return nutrients;
  }, [nutritionTargets]);

  const totals = log?.totals ?? { ...EMPTY_NUTRIENTS };
  const activeTargets = log?.targets ?? targetNutrients;

  const coverage = useMemo(
    () => computeCoverage(totals, activeTargets),
    [totals, activeTargets]
  );

  const suggestions = useMemo(
    () =>
      getNutritionSuggestions(totals, activeTargets, getLoggedFoodIds(log?.entries ?? [])),
    [totals, activeTargets, log?.entries]
  );

  const weightProjection = useMemo(() => {
    const targetKg = settings?.targetWeightKg ?? nutritionTargets.targetWeightKg;
    const pace = settings?.gainPace ?? 'moderate';
    return computeWeightProjection(currentWeight, targetKg, pace);
  }, [currentWeight, settings, nutritionTargets.targetWeightKg]);

  const surplusAvg = useMemo(() => {
    if (weeklyLogs.length === 0) return 0;
    const sum = weeklyLogs.reduce(
      (acc, d) => acc + (d.totals.calories - d.targets.calories),
      0
    );
    return Math.round(sum / weeklyLogs.length);
  }, [weeklyLogs]);

  useEffect(() => {
    setDateKey(getTodayDateKey(timezone));
  }, [timezone]);

  // Bootstrap settings + ensure log doc (stable deps — no `targets` object)
  useEffect(() => {
    if (!uid || !profileHydrated) {
      if (profileHydrated && !uid) setLoading(false);
      return;
    }

    const gen = ++initGenRef.current;

    async function init() {
      setLoading(true);
      setError(null);
      try {
        const s = await ensureNutritionSettings(uid!, timezone);
        if (gen !== initGenRef.current) return;
        setSettings(s);

        const targets = computeNutritionTargets(
          profile,
          s.gainPace,
          s.targetWeightKg ?? weeklyGoals?.targetWeight ?? profile.weight + 5,
          s.overrides
        );
        const { targetWeightKg, currentWeightKg, ...nutrients } = targets;
        void targetWeightKg;
        void currentWeightKg;

        await ensureNutritionLog(uid!, dateKey, nutrients);

        const [customs, recent, st] = await Promise.all([
          getCustomFoods(uid!),
          getRecentNutritionLogs(uid!, 30),
          getNutritionStreak(uid!),
        ]);

        if (gen !== initGenRef.current) return;
        setCustomFoods(customs);
        setWeeklyLogs(recent);
        setStreak(st);
      } catch (err) {
        if (gen !== initGenRef.current) return;
        setError(err instanceof Error ? err.message : 'Failed to load diet tracker');
      } finally {
        if (gen === initGenRef.current) setLoading(false);
      }
    }

    void init();
  }, [
    uid,
    profileHydrated,
    timezone,
    dateKey,
    profile.weight,
    profile.height,
    profile.age,
    profile.gender,
    profile.goal,
    weeklyGoals?.targetWeight,
  ]);

  useEffect(() => {
    if (!uid) return;
    const unsub = subscribeNutritionLog(
      uid,
      dateKey,
      (data) => setLog(data),
      (err) => setError(err.message)
    );
    return unsub;
  }, [uid, dateKey]);

  useEffect(() => {
    if (!uid) return;
    void getRecentNutritionLogs(uid, 30).then(setWeeklyLogs);
    void getNutritionStreak(uid).then(setStreak);
  }, [uid, log?.completed, log?.totals.calories]);

  const goToPrevDay = useCallback(() => {
    setDateKey((k) => shiftDateKey(k, -1));
  }, []);

  const goToNextDay = useCallback(() => {
    const today = getTodayDateKey(timezone);
    setDateKey((k) => {
      const next = shiftDateKey(k, 1);
      return next > today ? k : next;
    });
  }, [timezone]);

  const goToToday = useCallback(() => {
    setDateKey(getTodayDateKey(timezone));
  }, [timezone]);

  const logFood = useCallback(
    async (
      food: Pick<FoodItem, 'id' | 'name' | 'nutrients'> & { nutrients: NutrientsPerServing },
      mealSlot: MealSlot,
      servings: number,
      isCustom: boolean
    ) => {
      if (!uid) return;
      setActionLoading(true);
      setError(null);
      try {
        const nutrients = scaleNutrients(food.nutrients, servings);
        const added = await addNutritionEntry(
          uid,
          dateKey,
          {
            ...(isCustom ? {} : { foodId: food.id }),
            name: food.name,
            mealSlot,
            servings,
            nutrients,
            isCustom,
          },
          activeTargets
        );
        setLog((prev) => {
          const entries = [...(prev?.entries ?? []), added];
          const newTotals = sumNutrients(entries);
          return {
            entries,
            totals: newTotals,
            targets: prev?.targets ?? activeTargets,
            completed: isNutritionGoalMet(newTotals, prev?.targets ?? activeTargets),
          };
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to log food';
        setError(msg);
        throw err;
      } finally {
        setActionLoading(false);
      }
    },
    [uid, dateKey, activeTargets]
  );

  const logImportedFoods = useCallback(
    async (entries: DietImportLogPayload[]) => {
      if (!uid || entries.length === 0) return;
      setActionLoading(true);
      setError(null);
      try {
        const added: NutritionLogEntry[] = [];
        const newCustomFoods: FoodItem[] = [];

        for (const entry of entries) {
          let foodId = entry.foodId;

          // Automatically persist custom foods from AI import for future reuse
          if (entry.isCustom && !foodId) {
            foodId = `custom_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
            const newCustomFood: FoodItem = {
              id: foodId,
              name: entry.name,
              servingLabel: entry.servingLabel || '1 serving',
              nutrients: entry.nutrients,
              category: 'custom',
              tags: ['veg'],
              isCustom: true,
            };
            await saveCustomFood(uid, newCustomFood);
            newCustomFoods.push(newCustomFood);
          }

          const result = await addNutritionEntry(
            uid,
            dateKey,
            {
              ...(foodId ? { foodId } : {}),
              name: entry.name,
              mealSlot: entry.mealSlot,
              servings: entry.servings,
              nutrients: entry.nutrients,
              isCustom: entry.isCustom,
            },
            activeTargets
          );
          added.push(result);
        }

        if (newCustomFoods.length > 0) {
          setCustomFoods((prev) => [...prev, ...newCustomFoods]);
        }

        setLog((prev) => {
          const allEntries = [...(prev?.entries ?? []), ...added];
          const newTotals = sumNutrients(allEntries);
          return {
            entries: allEntries,
            totals: newTotals,
            targets: prev?.targets ?? activeTargets,
            completed: isNutritionGoalMet(newTotals, prev?.targets ?? activeTargets),
          };
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to import diet log';
        setError(msg);
        throw err;
      } finally {
        setActionLoading(false);
      }
    },
    [uid, dateKey, activeTargets]
  );

  const logCustomFood = useCallback(
    async (
      name: string,
      nutrients: NutrientsPerServing,
      mealSlot: MealSlot,
      saveTemplate?: boolean,
      servings: number = 1,
      servingLabel: string = '1 serving'
    ) => {
      if (!uid) return;
      const id = `custom_${Date.now()}`;
      if (saveTemplate) {
        await saveCustomFood(uid, {
          id,
          name,
          servingLabel,
          nutrients,
          category: 'custom',
          tags: ['veg'],
          isCustom: true,
        });
        setCustomFoods((prev) => [
          ...prev,
          { id, name, servingLabel, nutrients, category: 'custom', tags: ['veg'], isCustom: true },
        ]);
      }
      await logFood({ id, name, nutrients }, mealSlot, servings, true);
    },
    [uid, logFood]
  );

  const removeEntry = useCallback(
    async (entryId: string) => {
      if (!uid) return;
      setActionLoading(true);
      try {
        await removeNutritionEntry(uid, dateKey, entryId);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to remove entry');
        throw err;
      } finally {
        setActionLoading(false);
      }
    },
    [uid, dateKey]
  );

  const editEntry = useCallback(
    async (
      entryId: string,
      patch: Partial<Pick<NutritionLogEntry, 'servings' | 'nutrients' | 'name' | 'mealSlot'>>
    ) => {
      if (!uid) return;
      setActionLoading(true);
      try {
        await updateNutritionEntry(uid, dateKey, entryId, patch);
        setLog((prev) => {
          if (!prev) return prev;
          const entries = prev.entries.map((e) =>
            e.id === entryId ? { ...e, ...patch } : e
          );
          const newTotals = sumNutrients(entries);
          return {
            ...prev,
            entries,
            totals: newTotals,
            completed: isNutritionGoalMet(newTotals, prev.targets),
          };
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update entry');
        throw err;
      } finally {
        setActionLoading(false);
      }
    },
    [uid, dateKey]
  );

  const caloriesLeft = Math.max(0, activeTargets.calories - totals.calories);
  const proteinLeft = Math.max(0, Math.round((activeTargets.proteinG - totals.proteinG) * 10) / 10);

  const isPageLoading = !profileHydrated || (loading && !log && !error);

  return {
    dateKey,
    timezone,
    settings,
    log,
    entries: log?.entries ?? [],
    totals,
    targets: activeTargets,
    nutritionTargets,
    coverage,
    suggestions,
    customFoods,
    weeklyLogs,
    streak,
    surplusAvg,
    weightProjection,
    currentWeight,
    caloriesLeft,
    proteinLeft,
    loading: isPageLoading,
    actionLoading,
    error,
    ready: profileHydrated && !!uid,
    uid,
    goToPrevDay,
    goToNextDay,
    goToToday,
    logFood,
    logImportedFoods,
    logCustomFood,
    removeEntry,
    editEntry,
    isToday: dateKey === getTodayDateKey(timezone),
  };
}
