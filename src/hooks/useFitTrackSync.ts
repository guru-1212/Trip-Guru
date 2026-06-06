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
  TodayExercisePick,
  UserProfile,
  WeeklyGoals,
  WorkoutSession,
} from '@/workout/types';
import { getDefaultProfile, mergeVariationImages, normalizeProfile } from '@/workout/utils';
import { loadVariationImages } from '@/workout/storage';

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
  setSplitTodayPicks: (p: Partial<Record<SplitId, TodayExercisePick[]>>) => void;
  setHydrated: (h: boolean) => void;
  setSyncing: (s: boolean) => void;
}

export interface FitTrackSyncOptions {
  /** Run localStorage migration only for this uid (typically the auth uid, not a linked owner). */
  migrateUid?: string | null;
}

export function useFitTrackSync(
  uid: string | null | undefined,
  callbacks: FitTrackSyncCallbacks,
  options?: FitTrackSyncOptions
) {
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

    const migrateUid = options?.migrateUid;

    (async () => {
      try {
        await ensureFitTrackDefaults(uid);
        if (migrateUid) {
          const migrated = await migrateLocalStorageToFirebase(migrateUid);
          if (migrated && !cancelled) {
            console.info('[FitTrack] Migrated local data to Firebase');
          }
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
          cb().setProfile(
            snap.exists() ? normalizeProfile(snap.data() as Partial<UserProfile>) : getDefaultProfile()
          );
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
          cb().setVariationImages(
            mergeVariationImages(loadVariationImages(), data.variationImages ?? {})
          );
          cb().setSplitExtras(data.splitExtras ?? {});
          cb().setSplitTodayPicks(data.splitTodayPicks ?? {});
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
