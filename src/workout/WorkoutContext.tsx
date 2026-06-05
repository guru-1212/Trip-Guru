'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import type {
  ActiveWorkoutState,
  BodyStat,
  ChecklistData,
  CustomExercise,
  HabitDay,
  PersonalRecord,
  UserProfile,
  WeeklyGoals,
  WorkoutExercise,
  WorkoutSession,
} from './types';
import * as storage from './storage';
import {
  calcWorkoutVolume,
  countCompletedSets,
  generateId,
  getWeekStart,
  updatePRsFromWorkout,
  syncWorkoutHabits,
  updatePRDatesForWorkout,
} from './utils';
import { SPLIT_NAMES } from './constants';
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
  const [profile, setProfile] = useState<UserProfile>(storage.loadProfile());
  const [workouts, setWorkouts] = useState<WorkoutSession[]>([]);
  const [prs, setPRs] = useState<Record<string, PersonalRecord>>({});
  const [customExercises, setCustomExercises] = useState<CustomExercise[]>([]);
  const [bodyStats, setBodyStats] = useState<BodyStat[]>([]);
  const [habits, setHabits] = useState<Record<string, HabitDay>>({});
  const [weeklyGoals, setWeeklyGoals] = useState<WeeklyGoals>(storage.loadWeeklyGoals());
  const [checklist, setChecklist] = useState<ChecklistData>(storage.loadChecklist());
  const [activeWorkout, setActiveWorkout] = useState<ActiveWorkoutState | null>(null);
  const [customVariations, setCustomVariations] = useState<Record<string, string[]>>({});
  const [splitExtras, setSplitExtras] = useState<Partial<Record<SplitId, string[]>>>({});
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setProfile(storage.loadProfile());
    setWorkouts(storage.loadWorkouts());
    setPRs(storage.loadPRs());
    setCustomExercises(storage.loadCustomExercises());
    setBodyStats(storage.loadBodyStats());
    setHabits(storage.loadHabits());
    setWeeklyGoals(storage.loadWeeklyGoals());
    setChecklist(storage.loadChecklist());
    setActiveWorkout(storage.loadActiveWorkout());
    setCustomVariations(storage.loadCustomVariations());
    setSplitExtras(storage.loadSplitExtras());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const weekStart = getWeekStart();
    if (weeklyGoals.weekStart !== weekStart) {
      const updated = { ...weeklyGoals, weekStart };
      setWeeklyGoals(updated);
      storage.saveWeeklyGoals(updated);
    }
  }, [hydrated, weeklyGoals]);

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
      storage.saveProfile(next);
      toast.success('Profile saved');
      return next;
    });
  }, []);

  const saveWorkout = useCallback((session: Omit<WorkoutSession, 'id'>) => {
    const id = generateId();
    const full: WorkoutSession = { ...session, id };
    setWorkouts((prev) => {
      const next = [full, ...prev];
      storage.saveWorkouts(next);
      setHabits((h) => {
        const synced = syncWorkoutHabits(next, h);
        storage.saveHabits(synced);
        return synced;
      });
      return next;
    });
    setPRs((prev) => {
      const next = updatePRsFromWorkout(session.exercises, session.date, prev);
      storage.savePRs(next);
      return next;
    });
    toast.success('Workout saved!');
    return full;
  }, []);

  const startActiveWorkout = useCallback((state: ActiveWorkoutState) => {
    setActiveWorkout(state);
    storage.saveActiveWorkout(state);
  }, []);

  const updateActiveWorkout = useCallback((state: ActiveWorkoutState) => {
    setActiveWorkout(state);
    storage.saveActiveWorkout(state);
  }, []);

  const clearActiveWorkout = useCallback(() => {
    setActiveWorkout(null);
    storage.saveActiveWorkout(null);
  }, []);

  const addCustomExercise = useCallback((ex: Omit<CustomExercise, 'id'>) => {
    const item: CustomExercise = { ...ex, id: generateId() };
    setCustomExercises((prev) => {
      const next = [...prev, item];
      storage.saveCustomExercises(next);
      return next;
    });
    toast.success('Custom exercise added');
    return item;
  }, []);

  const updateCustomExercise = useCallback((id: string, ex: Partial<CustomExercise>) => {
    setCustomExercises((prev) => {
      const next = prev.map((e) => (e.id === id ? { ...e, ...ex } : e));
      storage.saveCustomExercises(next);
      return next;
    });
    toast.success('Exercise updated');
  }, []);

  const deleteCustomExercise = useCallback((id: string) => {
    setCustomExercises((prev) => {
      const next = prev.filter((e) => e.id !== id);
      storage.saveCustomExercises(next);
      return next;
    });
    toast.success('Exercise deleted');
  }, []);

  const addBodyStat = useCallback((stat: BodyStat) => {
    setBodyStats((prev) => {
      const filtered = prev.filter((s) => s.date !== stat.date);
      const next = [stat, ...filtered].sort((a, b) => b.date.localeCompare(a.date));
      storage.saveBodyStats(next);
      return next;
    });
    toast.success('Body stat saved');
  }, []);

  const toggleHabit = useCallback((date: string, key: keyof HabitDay) => {
    setHabits((prev) => {
      const day = prev[date] ?? { workout: false, water: false, sleep: false, protein: false, steps: false };
      const next = { ...prev, [date]: { ...day, [key]: !day[key] } };
      storage.saveHabits(next);
      return next;
    });
  }, []);

  const updateWeeklyGoals = useCallback((goals: Partial<WeeklyGoals>) => {
    setWeeklyGoals((prev) => {
      const next = { ...prev, ...goals };
      storage.saveWeeklyGoals(next);
      toast.success('Goals updated');
      return next;
    });
  }, []);

  const updateChecklist = useCallback((data: ChecklistData) => {
    setChecklist(data);
    storage.saveChecklist(data);
  }, []);

  const addChecklistItem = useCallback((label: string) => {
    setChecklist((prev) => {
      const next = {
        ...prev,
        custom: [...prev.custom, { id: generateId(), label, done: false, type: 'custom' as const }],
      };
      storage.saveChecklist(next);
      toast.success('Item added');
      return next;
    });
  }, []);

  const deleteChecklistItem = useCallback((id: string) => {
    setChecklist((prev) => {
      const next = {
        ...prev,
        dailyItems: prev.dailyItems.filter((i) => i.id !== id),
        custom: prev.custom.filter((i) => i.id !== id),
      };
      storage.saveChecklist(next);
      toast.success('Item removed');
      return next;
    });
  }, []);

  const addVariation = useCallback((exerciseId: string, variation: string) => {
    setCustomVariations((prev) => {
      const existing = prev[exerciseId] ?? [];
      if (existing.includes(variation)) return prev;
      const next = { ...prev, [exerciseId]: [...existing, variation] };
      storage.saveCustomVariations(next);
      toast.success('Variation added');
      return next;
    });
  }, []);

  const getVariationsForExercise = useCallback(
    (exerciseId: string, baseVariations: string[]) => {
      const custom = customVariations[exerciseId] ?? [];
      return Array.from(new Set([...baseVariations, ...custom]));
    },
    [customVariations]
  );

  const exportData = useCallback(() => {
    const json = storage.exportAllData();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workout-tracker-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Data exported');
  }, []);

  const importData = useCallback((json: string) => {
    const ok = storage.importAllData(json);
    if (ok) {
      setProfile(storage.loadProfile());
      setWorkouts(storage.loadWorkouts());
      setPRs(storage.loadPRs());
      setCustomExercises(storage.loadCustomExercises());
      setBodyStats(storage.loadBodyStats());
      setHabits(storage.loadHabits());
      setWeeklyGoals(storage.loadWeeklyGoals());
      setChecklist(storage.loadChecklist());
      setCustomVariations(storage.loadCustomVariations());
      setSplitExtras(storage.loadSplitExtras());
      toast.success('Data imported');
    } else {
      toast.error('Invalid import file');
    }
    return ok;
  }, []);

  const clearHistory = useCallback(() => {
    storage.clearWorkoutHistory();
    setWorkouts([]);
    toast.success('Workout history cleared');
  }, []);

  const clearAllPRs = useCallback(() => {
    storage.clearPRs();
    setPRs({});
    toast.success('Personal records cleared');
  }, []);

  const updateWorkoutDate = useCallback((id: string, newDate: string) => {
    setWorkouts((prev) => {
      const workout = prev.find((w) => w.id === id);
      if (!workout || workout.date === newDate) return prev;

      const oldDate = workout.date;
      const next = prev.map((w) => (w.id === id ? { ...w, date: newDate } : w));
      storage.saveWorkouts(next);

      setPRs((p) => {
        const updated = updatePRDatesForWorkout(workout, oldDate, newDate, p);
        storage.savePRs(updated);
        return updated;
      });

      setHabits((h) => {
        const synced = syncWorkoutHabits(next, h);
        storage.saveHabits(synced);
        return synced;
      });

      toast.success(`Workout moved to ${newDate}`);
      return next;
    });
  }, []);

  const rememberSplitExercise = useCallback((splitId: SplitId, exerciseId: string) => {
    setSplitExtras((prev) => {
      const existing = prev[splitId] ?? [];
      if (existing.includes(exerciseId)) return prev;
      const next = { ...prev, [splitId]: [...existing, exerciseId] };
      storage.saveSplitExtras(next);
      return next;
    });
  }, []);

  const deleteWorkout = useCallback((id: string) => {
    setWorkouts((prev) => {
      const next = prev.filter((w) => w.id !== id);
      storage.saveWorkouts(next);
      setHabits((h) => {
        const synced = syncWorkoutHabits(next, h);
        storage.saveHabits(synced);
        return synced;
      });
      toast.success('Workout deleted');
      return next;
    });
  }, []);

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
