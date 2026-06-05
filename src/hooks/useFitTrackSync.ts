'use client';

import { useEffect, useRef } from 'react';
import { collection, doc, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '@/firebase/db';
import {
  defaultStateDoc,
  ensureFitTrackDefaults,
  migrateLocalStorageToFirebase,
  normalizeChecklist,
} from '@/firebase/fittrack.firestore';
import type {
  ActiveWorkoutState,
  BodyStat,
  ChecklistData,
  CustomExercise,
  HabitDay,
  PersonalRecord,
  SplitId,
  UserProfile,
  WeeklyGoals,
  WorkoutSession,
} from '@/workout/types';
import { getDefaultProfile } from '@/workout/utils';

export interface FitTrackSyncCallbacks {
  setProfile: (p: UserProfile) => void;
  setWorkouts: (w: WorkoutSession[]) => void;
  setPRs: (p: Record<string, PersonalRecord>) => void;
  setCustomExercises: (e: CustomExercise[]) => void;
  setBodyStats: (s: BodyStat[]) => void;
  setHabits: (h: Record<string, HabitDay>) => void;
  setWeeklyGoals: (g: WeeklyGoals) => void;
  setChecklist: (c: ChecklistData) => void;
  setActiveWorkout: (a: ActiveWorkoutState | null) => void;
  setCustomVariations: (v: Record<string, string[]>) => void;
  setVariationImages: (v: Record<string, string>) => void;
  setSplitExtras: (e: Partial<Record<SplitId, string[]>>) => void;
  setHydrated: (h: boolean) => void;
  setSyncing: (s: boolean) => void;
}

export function useFitTrackSync(uid: string | null | undefined, callbacks: FitTrackSyncCallbacks) {
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  useEffect(() => {
    const cb = () => callbacksRef.current;

    if (!uid) {
      cb().setHydrated(false);
      return;
    }

    let cancelled = false;
    cb().setSyncing(true);

    (async () => {
      try {
        await ensureFitTrackDefaults(uid);
        const migrated = await migrateLocalStorageToFirebase(uid);
        if (migrated && !cancelled) {
          console.info('[FitTrack] Migrated local data to Firebase');
        }
      } catch (err) {
        console.error('[FitTrack] Migration error:', err);
      }
    })();

    const unsubs: (() => void)[] = [];

    unsubs.push(
      onSnapshot(
        doc(db(), 'users', uid, 'fittrack', 'profile'),
        (snap) => {
          if (cancelled) return;
          cb().setProfile(snap.exists() ? (snap.data() as UserProfile) : getDefaultProfile());
        },
        (err) => console.error('[FitTrack] profile listener:', err)
      )
    );

    unsubs.push(
      onSnapshot(
        doc(db(), 'users', uid, 'fittrack', 'state'),
        (snap) => {
          if (cancelled) return;
          const defaults = defaultStateDoc();
          const data = snap.exists() ? (snap.data() as typeof defaults) : defaults;
          cb().setPRs(data.prs ?? {});
          cb().setHabits(data.habits ?? {});
          cb().setWeeklyGoals(data.weeklyGoals ?? defaults.weeklyGoals);
          cb().setChecklist(normalizeChecklist(data.checklist));
          cb().setActiveWorkout(data.activeWorkout ?? null);
          cb().setCustomVariations(data.customVariations ?? {});
          cb().setVariationImages(data.variationImages ?? {});
          cb().setSplitExtras(data.splitExtras ?? {});
        },
        (err) => console.error('[FitTrack] state listener:', err)
      )
    );

    unsubs.push(
      onSnapshot(
        query(collection(db(), 'users', uid, 'fittrackWorkouts'), orderBy('date', 'desc')),
        (snap) => {
          if (cancelled) return;
          cb().setWorkouts(
            snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<WorkoutSession, 'id'>) }))
          );
        },
        (err) => console.error('[FitTrack] workouts listener:', err)
      )
    );

    unsubs.push(
      onSnapshot(
        collection(db(), 'users', uid, 'fittrackCustomExercises'),
        (snap) => {
          if (cancelled) return;
          cb().setCustomExercises(
            snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<CustomExercise, 'id'>) }))
          );
        },
        (err) => console.error('[FitTrack] custom exercises listener:', err)
      )
    );

    unsubs.push(
      onSnapshot(
        query(collection(db(), 'users', uid, 'fittrackBodyStats'), orderBy('date', 'desc')),
        (snap) => {
          if (cancelled) return;
          cb().setBodyStats(snap.docs.map((d) => d.data() as BodyStat));
          cb().setHydrated(true);
          cb().setSyncing(false);
        },
        (err) => {
          console.error('[FitTrack] body stats listener:', err);
          cb().setHydrated(true);
          cb().setSyncing(false);
        }
      )
    );

    return () => {
      cancelled = true;
      unsubs.forEach((u) => u());
    };
  }, [uid]);
}
