'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '@/hooks/useAuth';
import { useFitTrackSync } from '@/hooks/useFitTrackSync';
import { getFitTrackOwnerId } from '@/firebase/fittrackPartners.firestore';
import * as fittrackDb from '@/firebase/fittrack.firestore';
import { uploadFitTrackVariationImage } from '@/firebase/storage';
import type {
  ActiveWorkoutState,
  BodyStat,
  ChecklistData,
  CustomExercise,
  HabitDay,
  PersonalRecord,
  UserProfile,
  VariationImageMap,
  WeeklyGoals,
  WorkoutSession,
  UserPrefs,
  TodayExercisePick,
} from './types';
import {
  generateId,
  getWeekStart,
  updatePRsFromWorkout,
  syncWorkoutHabits,
  updatePRDatesForWorkout,
  getDefaultProfile,
  variationImageKey,
  cloudSafeVariationImages,
  isRemoteImageUrl,
  compressImageFile,
  dataUrlToBlob,
  countCompletedSets,
  isExerciseFullyDone,
} from './utils';
import * as localStorage from './storage';
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
  variationImages: VariationImageMap;
  splitExtras: Partial<Record<SplitId, string[]>>;
  splitTodayPicks: Partial<Record<SplitId, TodayExercisePick[]>>;
  splitSequenceLocked: Partial<Record<SplitId, boolean>>;
  hydrated: boolean;
  syncing: boolean;
  fittrackOwnerId: string | null;
  isFitTrackPartner: boolean;
  updateProfile: (p: Partial<Omit<UserProfile, 'prefs'>> & { prefs?: Partial<UserPrefs> }) => void;
  saveWorkout: (session: Omit<WorkoutSession, 'id'>) => WorkoutSession;
  startActiveWorkout: (state: ActiveWorkoutState) => void;
  updateActiveWorkout: (state: ActiveWorkoutState) => void;
  patchActiveWorkout: (patcher: (prev: ActiveWorkoutState) => ActiveWorkoutState) => void;
  clearActiveWorkout: () => void;
  removeExerciseFromActiveWorkout: (exerciseId: string) => void;
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
  removeVariation: (exerciseId: string, variation: string, baseVariations: string[]) => void;
  renameVariation: (
    exerciseId: string,
    oldName: string,
    newName: string,
    baseVariations: string[]
  ) => void;
  getVariationsForExercise: (exerciseId: string, baseVariations: string[]) => string[];
  setVariationImage: (exerciseId: string, variation: string, imageSrc: string) => void;
  uploadVariationImageFromFile: (exerciseId: string, variation: string, file: File) => Promise<void>;
  removeVariationImage: (exerciseId: string, variation: string) => void;
  getVariationImage: (exerciseId: string, variation: string) => string | undefined;
  exportData: () => void;
  importData: (json: string) => boolean;
  clearHistory: () => void;
  clearAllPRs: () => void;
  updateWorkoutDate: (id: string, newDate: string) => void;
  deleteWorkout: (id: string) => void;
  rememberSplitExercise: (splitId: SplitId, exerciseId: string) => void;
  rememberTodayPicks: (splitId: SplitId, picks: TodayExercisePick[]) => void;
  rememberSequenceLocked: (splitId: SplitId, locked: boolean) => void;
}

const WorkoutContext = createContext<WorkoutContextValue | null>(null);

export function WorkoutProvider({ children }: { children: React.ReactNode }) {
  const { uid, user } = useAuth();
  const effectiveUid = uid ? getFitTrackOwnerId(uid, user) : null;
  const isFitTrackPartner = !!(uid && user?.fittrackLinkedOwnerId);
  const uidRef = useRef(effectiveUid);
  uidRef.current = effectiveUid;

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
  const [variationImages, setVariationImages] = useState<VariationImageMap>({});
  const [splitExtras, setSplitExtras] = useState<Partial<Record<SplitId, string[]>>>({});
  const [splitTodayPicks, setSplitTodayPicks] = useState<Partial<Record<SplitId, TodayExercisePick[]>>>({});
  const [splitSequenceLocked, setSplitSequenceLocked] = useState<Partial<Record<SplitId, boolean>>>({});
  const [hydrated, setHydrated] = useState(false);
  const [syncing, setSyncing] = useState(true);

  const mergeActiveWorkoutFromRemote = useCallback((remote: ActiveWorkoutState | null) => {
    setActiveWorkout((local) => {
      if (remote === null) return null;
      if (local === null) return remote;
      if (local.startedAt !== remote.startedAt) return remote;

      const localDone = countCompletedSets(local.exercises);
      const remoteDone = countCompletedSets(remote.exercises);
      if (localDone > remoteDone) return local;

      const localFullyDone = local.exercises.filter(isExerciseFullyDone).length;
      const remoteFullyDone = remote.exercises.filter(isExerciseFullyDone).length;
      if (localFullyDone > remoteFullyDone) return local;

      return remote;
    });
  }, []);

  useFitTrackSync(effectiveUid, {
    setProfile,
    setWorkouts,
    setPRs,
    setCustomExercises,
    setBodyStats,
    setHabits,
    setWeeklyGoals,
    setChecklist,
    setActiveWorkout: mergeActiveWorkoutFromRemote,
    setCustomVariations,
    setVariationImages,
    setSplitExtras,
    setSplitTodayPicks,
    setSplitSequenceLocked,
    setHydrated,
    setSyncing,
  }, { migrateUid: isFitTrackPartner ? null : uid });

  const persistState = useCallback(
    async (patch: Partial<fittrackDb.FitTrackStateDoc>) => {
      const currentUid = uidRef.current;
      if (!currentUid) return;
      try {
        await fittrackDb.saveFitTrackState(currentUid, patch);
      } catch (err) {
        console.error('[FitTrack] save state failed:', err);
        toast.error('Could not sync to cloud. Your data is saved on this device.');
      }
    },
    []
  );

  const syncVariationImagesToCloud = useCallback(async (images: VariationImageMap) => {
    const currentUid = uidRef.current;
    if (!currentUid) return;
    try {
      await fittrackDb.saveFitTrackState(currentUid, {
        variationImages: cloudSafeVariationImages(images),
      });
    } catch (err) {
      console.error('[FitTrack] variation image cloud sync failed:', err);
    }
  }, []);

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

  const updateProfile = useCallback((p: Partial<Omit<UserProfile, 'prefs'>> & { prefs?: Partial<UserPrefs> }) => {
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

  const patchActiveWorkout = useCallback(
    (patcher: (prev: ActiveWorkoutState) => ActiveWorkoutState) => {
      setActiveWorkout((prev) => {
        if (!prev) return prev;
        const next = patcher(prev);
        persistState({ activeWorkout: next });
        return next;
      });
    },
    [persistState]
  );

  const clearActiveWorkout = useCallback(() => {
    setActiveWorkout(null);
    persistState({ activeWorkout: null });
  }, [persistState]);

  const removeExerciseFromActiveWorkout = useCallback((exerciseId: string) => {
    setActiveWorkout((prev) => {
      if (!prev) return prev;
      if (!(prev.addedExerciseIds ?? []).includes(exerciseId)) return prev;
      const next: ActiveWorkoutState = {
        ...prev,
        exercises: prev.exercises.filter((e) => e.exerciseId !== exerciseId),
        addedExerciseIds: (prev.addedExerciseIds ?? []).filter((id) => id !== exerciseId),
        pickOrder: (prev.pickOrder ?? []).filter((id) => id !== exerciseId),
      };
      persistState({ activeWorkout: next });
      return next;
    });
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

  const setVariationImage = useCallback(
    (exerciseId: string, variation: string, imageSrc: string, successMessage?: string) => {
      const key = variationImageKey(exerciseId, variation);
      setVariationImages((prev) => {
        const next = { ...prev, [key]: imageSrc };
        try {
          localStorage.saveVariationImages(next);
        } catch (err) {
          console.error('[FitTrack] local variation image save failed:', err);
          toast.error('Image is too large. Try a smaller file or paste an image URL instead.');
          return prev;
        }
        void syncVariationImagesToCloud(next);
        toast.success(
          successMessage ??
            (isRemoteImageUrl(imageSrc) ? 'Image saved and synced' : 'Image saved on this device')
        );
        return next;
      });
    },
    [syncVariationImagesToCloud]
  );

  const uploadVariationImageFromFile = useCallback(
    async (exerciseId: string, variation: string, file: File) => {
      const compressed = await compressImageFile(file);
      const currentUid = uidRef.current;

      if (!currentUid) {
        setVariationImage(
          exerciseId,
          variation,
          compressed,
          'Image saved on this device — sign in to sync across devices'
        );
        return;
      }

      const toastId = toast.loading('Uploading image…');
      try {
        const blob = dataUrlToBlob(compressed);
        const downloadUrl = await uploadFitTrackVariationImage(
          currentUid,
          exerciseId,
          variation,
          blob
        );
        toast.dismiss(toastId);
        setVariationImage(exerciseId, variation, downloadUrl, 'Image uploaded and synced');
      } catch (err) {
        console.error('[FitTrack] variation image upload failed:', err);
        toast.dismiss(toastId);
        setVariationImage(
          exerciseId,
          variation,
          compressed,
          'Cloud upload failed — saved on this device only'
        );
      }
    },
    [setVariationImage]
  );

  const removeVariationImage = useCallback(
    (exerciseId: string, variation: string) => {
      const key = variationImageKey(exerciseId, variation);
      setVariationImages((prev) => {
        if (!prev[key]) return prev;
        const next = { ...prev, [key]: '' };
        localStorage.saveVariationImages(next);
        void syncVariationImagesToCloud(next);
        toast.success('Image removed');
        return next;
      });
    },
    [syncVariationImagesToCloud]
  );

  const removeVariation = useCallback(
    (exerciseId: string, variation: string, _baseVariations: string[]) => {
      const customEx = customExercises.find((e) => e.id === exerciseId);
      if (customEx) {
        if (customEx.variations.length <= 1) {
          toast.error('Keep at least one variation');
          return;
        }
        if (!customEx.variations.includes(variation)) return;
        updateCustomExercise(exerciseId, {
          variations: customEx.variations.filter((v) => v !== variation),
        });
        removeVariationImage(exerciseId, variation);
        return;
      }

      const custom = customVariations[exerciseId] ?? [];
      if (!custom.includes(variation)) {
        toast.error('Cannot remove built-in variations');
        return;
      }

      setCustomVariations((prev) => {
        const nextList = (prev[exerciseId] ?? []).filter((v) => v !== variation);
        const next = { ...prev };
        next[exerciseId] = nextList;
        persistState({ customVariations: next });
        toast.success('Variation removed');
        return next;
      });
      removeVariationImage(exerciseId, variation);
    },
    [customExercises, customVariations, persistState, removeVariationImage, updateCustomExercise]
  );

  const renameVariation = useCallback(
    (exerciseId: string, oldName: string, newName: string, baseVariations: string[]) => {
      const trimmed = newName.trim();
      if (!trimmed) {
        toast.error('Enter a variation name');
        return;
      }
      if (trimmed === oldName) return;

      const customEx = customExercises.find((e) => e.id === exerciseId);
      const allCurrent = customEx
        ? customEx.variations
        : Array.from(new Set([...baseVariations, ...(customVariations[exerciseId] ?? [])]));

      if (allCurrent.includes(trimmed)) {
        toast.error('Variation already exists');
        return;
      }

      if (customEx) {
        if (!customEx.variations.includes(oldName)) return;
        setCustomExercises((prev) => {
          const next = prev.map((e) =>
            e.id === exerciseId
              ? { ...e, variations: e.variations.map((v) => (v === oldName ? trimmed : v)) }
              : e
          );
          const updated = next.find((e) => e.id === exerciseId);
          const currentUid = uidRef.current;
          if (currentUid && updated) {
            fittrackDb
              .saveFitTrackCustomExercise(currentUid, updated)
              .catch(() => toast.error('Failed to update exercise'));
          }
          return next;
        });
      } else {
        const custom = customVariations[exerciseId] ?? [];
        if (!custom.includes(oldName)) {
          toast.error('Cannot rename built-in variations');
          return;
        }
        setCustomVariations((prev) => {
          const next = {
            ...prev,
            [exerciseId]: (prev[exerciseId] ?? []).map((v) => (v === oldName ? trimmed : v)),
          };
          persistState({ customVariations: next });
          return next;
        });
      }

      setVariationImages((prev) => {
        const oldKey = variationImageKey(exerciseId, oldName);
        const img = prev[oldKey];
        if (!img) return prev;
        const next = { ...prev, [variationImageKey(exerciseId, trimmed)]: img, [oldKey]: '' };
        try {
          localStorage.saveVariationImages(next);
        } catch (err) {
          console.error('[FitTrack] variation image rename failed:', err);
          return prev;
        }
        void syncVariationImagesToCloud(next);
        return next;
      });

      toast.success('Variation renamed');
    },
    [customExercises, customVariations, persistState, syncVariationImagesToCloud]
  );

  const getVariationImage = useCallback(
    (exerciseId: string, variation: string) => {
      return variationImages[variationImageKey(exerciseId, variation)];
    },
    [variationImages]
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
      variationImages,
      splitExtras,
      splitTodayPicks,
      splitSequenceLocked,
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
  }, [profile, workouts, prs, customExercises, bodyStats, habits, weeklyGoals, checklist, customVariations, variationImages, splitExtras, splitTodayPicks, splitSequenceLocked]);

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

  const rememberTodayPicks = useCallback((splitId: SplitId, picks: TodayExercisePick[]) => {
    setSplitTodayPicks((prev) => {
      const next = { ...prev, [splitId]: picks };
      persistState({ splitTodayPicks: next });
      localStorage.saveSplitTodayPicks(next);
      return next;
    });
  }, [persistState]);

  const rememberSequenceLocked = useCallback((splitId: SplitId, locked: boolean) => {
    setSplitSequenceLocked((prev) => {
      const next = { ...prev };
      next[splitId] = locked;
      persistState({ splitSequenceLocked: next });
      localStorage.saveSplitSequenceLocked(next);
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
      variationImages,
      splitExtras,
      splitTodayPicks,
      splitSequenceLocked,
      hydrated,
      syncing,
      fittrackOwnerId: effectiveUid,
      isFitTrackPartner,
      updateProfile,
      saveWorkout,
      startActiveWorkout,
      updateActiveWorkout,
      patchActiveWorkout,
      clearActiveWorkout,
      removeExerciseFromActiveWorkout,
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
      removeVariation,
      renameVariation,
      getVariationsForExercise,
      setVariationImage,
      uploadVariationImageFromFile,
      removeVariationImage,
      getVariationImage,
      exportData,
      importData,
      clearHistory,
      clearAllPRs,
      updateWorkoutDate,
      deleteWorkout,
      rememberSplitExercise,
      rememberTodayPicks,
      rememberSequenceLocked,
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
      variationImages,
      splitExtras,
      splitTodayPicks,
      splitSequenceLocked,
      hydrated,
      syncing,
      effectiveUid,
      isFitTrackPartner,
      updateProfile,
      saveWorkout,
      startActiveWorkout,
      updateActiveWorkout,
      patchActiveWorkout,
      clearActiveWorkout,
      removeExerciseFromActiveWorkout,
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
      removeVariation,
      renameVariation,
      getVariationsForExercise,
      setVariationImage,
      uploadVariationImageFromFile,
      removeVariationImage,
      getVariationImage,
      exportData,
      importData,
      clearHistory,
      clearAllPRs,
      updateWorkoutDate,
      deleteWorkout,
      rememberSplitExercise,
      rememberTodayPicks,
      rememberSequenceLocked,
    ]
  );

  return <WorkoutContext.Provider value={value}>{children}</WorkoutContext.Provider>;
}

export function useWorkoutStore() {
  const ctx = useContext(WorkoutContext);
  if (!ctx) throw new Error('useWorkoutStore must be used within WorkoutProvider');
  return ctx;
}
