'use client';

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { FitTrackCelebrationOverlay } from './FitTrackCelebrationOverlay';
import type { WeightUnit } from '@/workout/types';
import type { TargetUnit } from '@/workout/targets';

export interface PRCelebrationPayload {
  exerciseId: string;
  exerciseName: string;
  variation: string;
  weight: number;
  reps: number;
  unit: WeightUnit;
  previousWeight?: number;
}

export interface WorkoutCompletePayload {
  splitName: string;
  duration: number;
  sets: number;
  volume: number;
  unit: WeightUnit;
  prCount: number;
  isFirstWorkoutToday: boolean;
  workoutStreak?: number;
  onDismiss?: () => void;
}

/**
 * Target bests are reps or seconds, not load, so they need their own payload —
 * PRCelebrationPayload would render a bodyweight best as "0 kg × 43".
 */
export interface TargetPRCelebrationPayload {
  targetId: string;
  targetName: string;
  exerciseName: string;
  value: number;
  unit: TargetUnit;
  previousBest: number;
  goalValue: number;
}

export type CelebrationEvent =
  | { id: string; variant: 'pr'; payload: PRCelebrationPayload }
  | { id: string; variant: 'target_pr'; payload: TargetPRCelebrationPayload }
  | { id: string; variant: 'workout_complete'; payload: WorkoutCompletePayload };

interface FitTrackCelebrationContextValue {
  celebratePR: (payload: PRCelebrationPayload) => void;
  celebrateTargetPR: (payload: TargetPRCelebrationPayload) => void;
  celebrateWorkoutComplete: (payload: WorkoutCompletePayload) => void;
  resetPRSession: () => void;
}

const FitTrackCelebrationContext = createContext<FitTrackCelebrationContextValue | null>(null);

let celebrationIdCounter = 0;

function nextId(): string {
  celebrationIdCounter += 1;
  return `celebration-${celebrationIdCounter}`;
}

export function FitTrackCelebrationProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<CelebrationEvent | null>(null);
  const queueRef = useRef<CelebrationEvent[]>([]);
  const prCelebratedRef = useRef<Set<string>>(new Set());
  const workoutDismissRef = useRef<(() => void) | undefined>(undefined);

  const showEvent = useCallback((event: CelebrationEvent) => {
    if (event.variant === 'workout_complete') {
      workoutDismissRef.current = event.payload.onDismiss;
    }
    setCurrent(event);
  }, []);

  const enqueue = useCallback(
    (event: CelebrationEvent) => {
      if (current) {
        queueRef.current.push(event);
      } else {
        showEvent(event);
      }
    },
    [current, showEvent]
  );

  const celebratePR = useCallback(
    (payload: PRCelebrationPayload) => {
      if (prCelebratedRef.current.has(payload.exerciseId)) return;
      prCelebratedRef.current.add(payload.exerciseId);
      enqueue({ id: nextId(), variant: 'pr', payload });
    },
    [enqueue]
  );

  // Keyed by targetId, not exerciseId: a push-up target best and a weighted
  // push-up PR are separate achievements and both deserve their moment.
  const celebrateTargetPR = useCallback(
    (payload: TargetPRCelebrationPayload) => {
      const key = `target:${payload.targetId}:${payload.value}`;
      if (prCelebratedRef.current.has(key)) return;
      prCelebratedRef.current.add(key);
      enqueue({ id: nextId(), variant: 'target_pr', payload });
    },
    [enqueue]
  );

  const celebrateWorkoutComplete = useCallback(
    (payload: WorkoutCompletePayload) => {
      enqueue({ id: nextId(), variant: 'workout_complete', payload });
    },
    [enqueue]
  );

  const resetPRSession = useCallback(() => {
    prCelebratedRef.current.clear();
  }, []);

  const handleDismiss = useCallback(() => {
    const dismissedVariant = current?.variant;
    const next = queueRef.current.shift();

    if (next) {
      showEvent(next);
      return;
    }

    setCurrent(null);

    if (dismissedVariant === 'workout_complete') {
      const cb = workoutDismissRef.current;
      workoutDismissRef.current = undefined;
      cb?.();
    }
  }, [current, showEvent]);

  return (
    <FitTrackCelebrationContext.Provider
      value={{ celebratePR, celebrateTargetPR, celebrateWorkoutComplete, resetPRSession }}
    >
      {children}
      <FitTrackCelebrationOverlay event={current} onDismiss={handleDismiss} />
    </FitTrackCelebrationContext.Provider>
  );
}

export function useFitTrackCelebration(): FitTrackCelebrationContextValue {
  const ctx = useContext(FitTrackCelebrationContext);
  if (!ctx) {
    throw new Error('useFitTrackCelebration must be used within FitTrackCelebrationProvider');
  }
  return ctx;
}
