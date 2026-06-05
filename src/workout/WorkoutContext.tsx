'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '@/hooks/useAuth';
import { useFitTrackSync } from '@/hooks/useFitTrackSync';
import * as fittrackDb from '@/firebase/fittrack.firestore';
import type {
  ActiveWorkoutState,
  BodyStat,
  ChecklistData,
  CustomExercise,
  HabitDay,
  PersonalRecord,
  UserProfile,
  WeeklyGoals,
  WorkoutSession,
} from './types';
import {
  generateId,
  getWeekStart,
  updatePRsFromWorkout,
  syncWorkoutHabits,
  updatePRDatesForWorkout,
  getDefaultProfile,
} from './utils';
import type { SplitId } from './types';

interface WorkoutContextValue {
  profile: UserProfile;
  workouts: WorkoutSession[];
  prs: Record<string, PersonalRecord>;
  customExercises: CustomExercise[];
  bodyStats: BodyStat[];
  habits: Record<string, HabitDay>;
  weeklyGoals: WeeklyGoals;
  checklist: ChecklistData;
  activeWorkout: ActiveWorkoutState | null;
  customVariations: Record<string, string[]>;
  splitExtras: Partial<Record<SplitId, string[]>>;
  hydrated: boolean;
  syncing: boolean;
  updateProfile: (p: Partial<UserProfile>) => void;
  saveWorkout: (session: Omit<WorkoutSession, 'id'>) => WorkoutSession;
  startActiveWorkout: (state: ActiveWorkoutState) => void;
  updateActiveWorkout: (state: ActiveWorkoutState) => void;
  clearActiveWorkout: () => void;
  addCustomExercise: (ex: Omit<CustomExercise, 'id'>) => CustomExercise;
  updateCustomExercise: (id: string, ex: Partial<CustomExercise>) => void;
  deleteCustomExercise: (id: string) => void;
  addBodyStat: (stat: BodyStat) => void;
  toggleHabit: (date: string, key: keyof HabitDay) => void;
  updateWeeklyGoals: (goals: Partial<WeeklyGoals>) => void;
  updateChecklist: (data: ChecklistData) => void;
  addChecklistItem: (label: string) => void;
  deleteChecklistItem: (id: string) => void;
  addVariation: (exerciseId: string, variation: string) => void;
  getVariationsForExercise: (exerciseId: string, baseVariations: string[]) => string[];
  exportData: () => void;
  importData: (json: string) => boolean;
  clearHistory: () => void;
  clearAllPRs: () => void;
  updateWorkoutDate: (id: string, newDate: string) => void;
  deleteWorkout: (id: string) => void;
  rememberSplitExercise: (splitId: SplitId, exerciseId: string) => void;
}

const WorkoutContext = createContext<WorkoutContextValue | null>(null);

export function WorkoutProvider({ children }: { children: React.ReactNode }) {
  const { uid } = useAuth();
  const uidRef = useRef(uid);
  uidRef.current = uid;

  const [profile, setProfile] = useState<UserProfile>(getDefaultProfile());
  const [workouts, setWorkouts] = useState<WorkoutSession[]>([]);
  const [prs, setPRs] = useState<Record<string, PersonalRecord>>({});
  const [customExercises, setCustomExercises] = useState<CustomExercise[]>([]);
  const [bodyStats, setBodyStats] = useState<BodyStat[]>([]);
  const [habits, setHabits] = useState<Record<string, HabitDay>>({});
  const [weeklyGoals, setWeeklyGoals] = useState<WeeklyGoals>(fittrackDb.defaultStateDoc().weeklyGoals);
  const [checklist, setChecklist] = useState<ChecklistData>(fittrackDb.defaultStateDoc().checklist);
  const [activeWorkout, setActiveWorkout] = useState<ActiveWorkoutState | null>(null);
  const [customVariations, setCustomVariations] = useState<Record<string, string[]>>({});
  const [splitExtras, setSplitExtras] = useState<Partial<Record<SplitId, string[]>>>({});
  const [hydrated, setHydrated] = useState(false);
  const [syncing, setSyncing] = useState(true);

  useFitTrackSync(uid, {
    setProfile,
    setWorkouts,
    setPRs,
    setCustomExercises,
    setBodyStats,
    setHabits,
    setWeeklyGoals,
    setChecklist,
    setActiveWorkout,
    setCustomVariations,
    setSplitExtras,
    setHydrated,
    setSyncing,
  });

  const persistState = useCallback(
    async (patch: Partial<fittrackDb.FitTrackStateDoc>) => {
      const currentUid = uidRef.current;
      if (!currentUid) return;
      try {
        await fittrackDb.saveFitTrackState(currentUid, patch);
      } catch (err) {
        console.error('[FitTrack] save state failed:', err);
        toast.error('Failed to sync. Check your connection.');
      }
    },
    []
  );

  useEffect(() => {
    if (!hydrated) return;
    const weekStart = getWeekStart();
    if (weeklyGoals.weekStart !== weekStart) {
      const updated = { ...weeklyGoals, weekStart };
      setWeeklyGoals(updated);
      persistState({ weeklyGoals: updated });
    }
  }, [hydrated, weeklyGoals, persistState]);

  useEffect(() => {
    if (!hydrated) return;
    const root = document.documentElement;
    const theme = profile.prefs.theme;
    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.toggle('wk-light', !prefersDark);
      root.classList.toggle('dark', prefersDark);
    } else if (theme === 'light') {
      root.classList.add('wk-light');
      root.classList.remove('dark');
    } else {
      root.classList.remove('wk-light');
      root.classList.add('dark');
    }
  }, [hydrated, profile.prefs.theme]);

  const updateProfile = useCallback((p: Partial<UserProfile>) => {
    setProfile((prev) => {
      const next = { ...prev, ...p, prefs: { ...prev.prefs, ...(p.prefs ?? {}) } };
      const currentUid = uidRef.current;
      if (currentUid) {
        fittrackDb.saveFitTrackProfile(currentUid, next).catch(() => toast.error('Failed to save profile'));
      }
      toast.success('Profile saved');
      return next;
    });
  }, []);

  const saveWorkout = useCallback((session: Omit<WorkoutSession, 'id'>) => {
    const id = generateId();
    const full: WorkoutSession = { ...session, id };
    const currentUid = uidRef.current;

    setWorkouts((prev) => {
      const nextWorkouts = [full, ...prev];
      setPRs((p) => {
        const nextPrs = updatePRsFromWorkout(session.exercises, session.date, p);
        setHabits((h) => {
          const nextHabits = syncWorkoutHabits(nextWorkouts, h);
          if (currentUid) {
            void fittrackDb.saveFitTrackWorkout(currentUid, full);
            void fittrackDb.saveFitTrackState(currentUid, {
              prs: nextPrs,
              habits: nextHabits,
              activeWorkout: null,
            });
          }
          return nextHabits;
        });
        return nextPrs;
      });
      return nextWorkouts;
    });

    setActiveWorkout(null);
    toast.success('Workout saved!');
    return full;
  }, []);

  const startActiveWorkout = useCallback((state: ActiveWorkoutState) => {
    setActiveWorkout(state);
    persistState({ activeWorkout: state });
  }, [persistState]);

  const updateActiveWorkout = useCallback((state: ActiveWorkoutState) => {
    setActiveWorkout(state);
    persistState({ activeWorkout: state });
  }, [persistState]);

  const clearActiveWorkout = useCallback(() => {
    setActiveWorkout(null);
    persistState({ activeWorkout: null });
  }, [persistState]);

  const addCustomExercise = useCallback((ex: Omit<CustomExercise, 'id'>) => {
    const item: CustomExercise = { ...ex, id: generateId() };
    setCustomExercises((prev) => [...prev, item]);
    const currentUid = uidRef.current;
    if (currentUid) {
      fittrackDb.saveFitTrackCustomExercise(currentUid, item).catch(() => toast.error('Failed to save exercise'));
    }
    toast.success('Custom exercise added');
    return item;
  }, []);

  const updateCustomExercise = useCallback((id: string, ex: Partial<CustomExercise>) => {
    setCustomExercises((prev) => {
      const next = prev.map((e) => (e.id === id ? { ...e, ...ex } : e));
      const updated = next.find((e) => e.id === id);
      const currentUid = uidRef.current;
      if (currentUid && updated) {
        fittrackDb.saveFitTrackCustomExercise(currentUid, updated).catch(() => toast.error('Failed to update exercise'));
      }
      return next;
    });
    toast.success('Exercise updated');
  }, []);

  const deleteCustomExercise = useCallback((id: string) => {
    setCustomExercises((prev) => prev.filter((e) => e.id !== id));
    const currentUid = uidRef.current;
    if (currentUid) {
      fittrackDb.deleteFitTrackCustomExercise(currentUid, id).catch(() => toast.error('Failed to delete exercise'));
    }
    toast.success('Exercise deleted');
  }, []);

  const addBodyStat = useCallback((stat: BodyStat) => {
    setBodyStats((prev) => {
      const filtered = prev.filter((s) => s.date !== stat.date);
      return [stat, ...filtered].sort((a, b) => b.date.localeCompare(a.date));
    });
    const currentUid = uidRef.current;
    if (currentUid) {
      fittrackDb.saveFitTrackBodyStat(currentUid, stat).catch(() => toast.error('Failed to save body stat'));
    }
    toast.success('Body stat saved');
  }, []);

  const toggleHabit = useCallback((date: string, key: keyof HabitDay) => {
    setHabits((prev) => {
      const day = prev[date] ?? { workout: false, water: false, sleep: false, protein: false, steps: false };
      const next = { ...prev, [date]: { ...day, [key]: !day[key] } };
      persistState({ habits: next });
      return next;
    });
  }, [persistState]);

  const updateWeeklyGoals = useCallback((goals: Partial<WeeklyGoals>) => {
    setWeeklyGoals((prev) => {
      const next = { ...prev, ...goals };
      persistState({ weeklyGoals: next });
      toast.success('Goals updated');
      return next;
    });
  }, [persistState]);

  const updateChecklist = useCallback((data: ChecklistData) => {
    setChecklist(data);
    persistState({ checklist: data });
  }, [persistState]);

  const addChecklistItem = useCallback((label: string) => {
    setChecklist((prev) => {
      const next = {
        ...prev,
        custom: [...prev.custom, { id: generateId(), label, done: false, type: 'custom' as const }],
      };
      persistState({ checklist: next });
      toast.success('Item added');
      return next;
    });
  }, [persistState]);

  const deleteChecklistItem = useCallback((id: string) => {
    setChecklist((prev) => {
      const next = {
        ...prev,
        dailyItems: prev.dailyItems.filter((i) => i.id !== id),
        custom: prev.custom.filter((i) => i.id !== id),
      };
      persistState({ checklist: next });
      toast.success('Item removed');
      return next;
    });
  }, [persistState]);

  const addVariation = useCallback((exerciseId: string, variation: string) => {
    setCustomVariations((prev) => {
      const existing = prev[exerciseId] ?? [];
      if (existing.includes(variation)) return prev;
      const next = { ...prev, [exerciseId]: [...existing, variation] };
      persistState({ customVariations: next });
      toast.success('Variation added');
      return next;
    });
  }, [persistState]);

  const getVariationsForExercise = useCallback(
    (exerciseId: string, baseVariations: string[]) => {
      const custom = customVariations[exerciseId] ?? [];
      return Array.from(new Set([...baseVariations, ...custom]));
    },
    [customVariations]
  );

  const exportData = useCallback(() => {
    const data = {
      profile,
      workouts,
      prs,
      customExercises,
      bodyStats,
      habits,
      weeklyGoals,
      checklist,
      customVariations,
      splitExtras,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fittrack-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Data exported');
  }, [profile, workouts, prs, customExercises, bodyStats, habits, weeklyGoals, checklist, customVariations, splitExtras]);

  const importData = useCallback((json: string) => {
    const currentUid = uidRef.current;
    if (!currentUid) {
      toast.error('You must be logged in to import data');
      return false;
    }
    try {
      const data = JSON.parse(json);
      fittrackDb.importFitTrackData(currentUid, data).then(() => {
        toast.success('Data imported to Firebase');
      }).catch(() => toast.error('Import failed'));
      return true;
    } catch {
      toast.error('Invalid import file');
      return false;
    }
  }, []);

  const clearHistory = useCallback(() => {
    const currentUid = uidRef.current;
    if (!currentUid) return;
    fittrackDb.deleteAllFitTrackWorkouts(currentUid).then(() => {
      setWorkouts([]);
      setHabits((h) => {
        const synced = syncWorkoutHabits([], h);
        persistState({ habits: synced });
        return synced;
      });
      toast.success('Workout history cleared');
    }).catch(() => toast.error('Failed to clear history'));
  }, [persistState]);

  const clearAllPRs = useCallback(() => {
    setPRs({});
    persistState({ prs: {} });
    toast.success('Personal records cleared');
  }, [persistState]);

  const updateWorkoutDate = useCallback((id: string, newDate: string) => {
    setWorkouts((prev) => {
      const workout = prev.find((w) => w.id === id);
      if (!workout || workout.date === newDate) return prev;

      const oldDate = workout.date;
      const next = prev.map((w) => (w.id === id ? { ...w, date: newDate } : w));
      const updatedWorkout = { ...workout, date: newDate };

      setPRs((p) => {
        const updated = updatePRDatesForWorkout(workout, oldDate, newDate, p);
        setHabits((h) => {
          const synced = syncWorkoutHabits(next, h);
          persistState({ prs: updated, habits: synced });
          return synced;
        });
        return updated;
      });

      const currentUid = uidRef.current;
      if (currentUid) {
        fittrackDb.saveFitTrackWorkout(currentUid, updatedWorkout).catch(() => toast.error('Failed to update workout date'));
      }

      toast.success(`Workout moved to ${newDate}`);
      return next;
    });
  }, [persistState]);

  const rememberSplitExercise = useCallback((splitId: SplitId, exerciseId: string) => {
    setSplitExtras((prev) => {
      const existing = prev[splitId] ?? [];
      if (existing.includes(exerciseId)) return prev;
      const next = { ...prev, [splitId]: [...existing, exerciseId] };
      persistState({ splitExtras: next });
      return next;
    });
  }, [persistState]);

  const deleteWorkout = useCallback((id: string) => {
    setWorkouts((prev) => {
      const next = prev.filter((w) => w.id !== id);
      setHabits((h) => {
        const synced = syncWorkoutHabits(next, h);
        persistState({ habits: synced });
        return synced;
      });
      const currentUid = uidRef.current;
      if (currentUid) {
        fittrackDb.deleteFitTrackWorkout(currentUid, id).catch(() => toast.error('Failed to delete workout'));
      }
      toast.success('Workout deleted');
      return next;
    });
  }, [persistState]);

  const value = useMemo(
    () => ({
      profile,
      workouts,
      prs,
      customExercises,
      bodyStats,
      habits,
      weeklyGoals,
      checklist,
      activeWorkout,
      customVariations,
      splitExtras,
      hydrated,
      syncing,
      updateProfile,
      saveWorkout,
      startActiveWorkout,
      updateActiveWorkout,
      clearActiveWorkout,
      addCustomExercise,
      updateCustomExercise,
      deleteCustomExercise,
      addBodyStat,
      toggleHabit,
      updateWeeklyGoals,
      updateChecklist,
      addChecklistItem,
      deleteChecklistItem,
      addVariation,
      getVariationsForExercise,
      exportData,
      importData,
      clearHistory,
      clearAllPRs,
      updateWorkoutDate,
      deleteWorkout,
      rememberSplitExercise,
    }),
    [
      profile,
      workouts,
      prs,
      customExercises,
      bodyStats,
      habits,
      weeklyGoals,
      checklist,
      activeWorkout,
      customVariations,
      splitExtras,
      hydrated,
      syncing,
      updateProfile,
      saveWorkout,
      startActiveWorkout,
      updateActiveWorkout,
      clearActiveWorkout,
      addCustomExercise,
      updateCustomExercise,
      deleteCustomExercise,
      addBodyStat,
      toggleHabit,
      updateWeeklyGoals,
      updateChecklist,
      addChecklistItem,
      deleteChecklistItem,
      addVariation,
      getVariationsForExercise,
      exportData,
      importData,
      clearHistory,
      clearAllPRs,
      updateWorkoutDate,
      deleteWorkout,
      rememberSplitExercise,
    ]
  );

  return <WorkoutContext.Provider value={value}>{children}</WorkoutContext.Provider>;
}

export function useWorkoutStore() {
  const ctx = useContext(WorkoutContext);
  if (!ctx) throw new Error('useWorkoutStore must be used within WorkoutProvider');
  return ctx;
}
