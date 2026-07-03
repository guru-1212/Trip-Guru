'use client';

import { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy,
  CheckCircle2,
  Dumbbell,
  TrendingUp,
  Flame,
} from 'lucide-react';
import { formatDuration, formatWeight, displayWeight } from '@/workout/utils';
import type { WeightUnit } from '@/workout/types';
import type { CelebrationEvent } from './FitTrackCelebrationProvider';

const SPRING = { type: 'spring' as const, stiffness: 260, damping: 18 };

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.9 },
  visible: { opacity: 1, y: 0, scale: 1, transition: SPRING },
};

function useReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

async function fireConfetti(intensity: 'pr' | 'workout_complete') {
  const { default: confetti } = await import('canvas-confetti');
  const colors = ['#F59E0B', '#EAB308', '#10B981', '#34D399', '#FFFFFF'];
  const particleCount = intensity === 'workout_complete' ? 120 : 80;

  confetti({
    particleCount,
    spread: 70,
    origin: { x: 0.5, y: 0.1 },
    colors,
    disableForReducedMotion: true,
  });

  setTimeout(() => {
    confetti({
      particleCount: Math.round(particleCount * 0.6),
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.5 },
      colors,
      disableForReducedMotion: true,
    });
    confetti({
      particleCount: Math.round(particleCount * 0.6),
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.5 },
      colors,
      disableForReducedMotion: true,
    });
  }, 300);
}

interface FitTrackCelebrationOverlayProps {
  event: CelebrationEvent | null;
  onDismiss: () => void;
}

export function FitTrackCelebrationOverlay({ event, onDismiss }: FitTrackCelebrationOverlayProps) {
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (!event) return;
    if (!reducedMotion) {
      fireConfetti(event.variant).catch(() => {});
    }
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([50, 30, 80]);
    }
  }, [event, reducedMotion]);

  useEffect(() => {
    if (!event) return;
    const duration = event.variant === 'pr' ? 3500 : 4500;
    const timer = setTimeout(onDismiss, duration);
    return () => clearTimeout(timer);
  }, [event, onDismiss]);

  const handleBackdropClick = useCallback(() => {
    onDismiss();
  }, [onDismiss]);

  if (!event) return null;

  return (
    <AnimatePresence>
      <motion.div
        key={event.id}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
        onClick={handleBackdropClick}
        role="dialog"
        aria-modal="true"
        aria-label={event.variant === 'pr' ? 'New personal best' : 'Workout complete'}
      >
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={SPRING}
          className="relative z-10 w-full max-w-sm"
          onClick={(e) => e.stopPropagation()}
        >
          {event.variant === 'pr' ? (
            <PRContent payload={event.payload} />
          ) : (
            <WorkoutCompleteContent payload={event.payload} onDismiss={onDismiss} />
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function PRContent({ payload }: { payload: Extract<CelebrationEvent, { variant: 'pr' }>['payload'] }) {
  const { exerciseName, variation, weight, reps, unit, previousWeight } = payload;
  const display = displayWeight(weight, unit);
  const isFirstRecord = previousWeight === undefined;

  let subtext = 'First record logged!';
  if (!isFirstRecord && previousWeight !== undefined) {
    const delta = displayWeight(weight - previousWeight, unit);
    subtext = `+${delta} ${unit} above your last best`;
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="bg-card border border-amber-500/30 rounded-3xl shadow-2xl p-8 text-center"
    >
      <motion.div variants={itemVariants} className="mb-5">
        <div className="w-20 h-20 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mx-auto shadow-[0_0_40px_rgba(245,158,11,0.25)]">
          <Trophy className="h-10 w-10 text-amber-500" />
        </div>
      </motion.div>

      <motion.div variants={itemVariants}>
        <span className="inline-block px-4 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-600 dark:text-amber-400 text-xs font-black uppercase tracking-[0.15em] mb-4">
          New Personal Best!
        </span>
      </motion.div>

      <motion.h2 variants={itemVariants} className="text-xl font-bold text-foreground mb-1">
        {exerciseName}
      </motion.h2>

      {variation && variation !== exerciseName && (
        <motion.p variants={itemVariants} className="text-sm text-muted-foreground mb-4">
          {variation}
        </motion.p>
      )}

      <motion.p variants={itemVariants} className="text-4xl font-black tabular-nums text-foreground mb-2">
        {display} <span className="text-2xl font-bold text-muted-foreground">{unit}</span>
        <span className="text-2xl font-bold text-muted-foreground"> × {reps}</span>
      </motion.p>

      <motion.p variants={itemVariants} className="text-sm font-semibold text-amber-600 dark:text-amber-400">
        {subtext}
      </motion.p>

      <motion.p variants={itemVariants} className="text-xs text-muted-foreground mt-6">
        Tap anywhere to keep going
      </motion.p>
    </motion.div>
  );
}

function WorkoutCompleteContent({
  payload,
  onDismiss,
}: {
  payload: Extract<CelebrationEvent, { variant: 'workout_complete' }>['payload'];
  onDismiss: () => void;
}) {
  const {
    splitName,
    duration,
    sets,
    volume,
    unit,
    prCount,
    isFirstWorkoutToday,
    workoutStreak,
  } = payload;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="bg-card border border-emerald-500/30 rounded-3xl shadow-2xl p-8 text-center"
    >
      <motion.div variants={itemVariants} className="mb-5">
        <div className="w-20 h-20 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto shadow-[0_0_40px_rgba(16,185,129,0.25)]">
          <CheckCircle2 className="h-10 w-10 text-emerald-500" />
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="flex flex-col items-center gap-2 mb-4">
        <span className="inline-block px-4 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-600 dark:text-emerald-400 text-xs font-black uppercase tracking-[0.15em]">
          Workout Complete!
        </span>
        {isFirstWorkoutToday && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/15 border border-orange-500/30 text-orange-600 dark:text-orange-400 text-[10px] font-black uppercase tracking-[0.12em]">
            <Flame className="h-3 w-3" />
            Daily Mission Complete
          </span>
        )}
      </motion.div>

      <motion.div variants={itemVariants} className="flex items-center justify-center gap-2 text-muted-foreground mb-5">
        <Dumbbell className="h-4 w-4" />
        <p className="text-sm font-semibold text-foreground">{splitName}</p>
        <span className="text-muted-foreground">·</span>
        <p className="text-sm tabular-nums">{formatDuration(duration)}</p>
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-3 gap-3 mb-5">
        <StatPill icon={CheckCircle2} label="Sets" value={String(sets)} />
        <StatPill icon={TrendingUp} label="Volume" value={formatWeight(volume, unit)} />
        <StatPill icon={Trophy} label="PRs" value={String(prCount)} />
      </motion.div>

      {isFirstWorkoutToday && workoutStreak !== undefined && workoutStreak > 0 && (
        <motion.p variants={itemVariants} className="text-sm font-bold text-orange-500 mb-5 flex items-center justify-center gap-1.5">
          <Flame className="h-4 w-4" />
          {workoutStreak} day streak
        </motion.p>
      )}

      <motion.button
        variants={itemVariants}
        type="button"
        onClick={onDismiss}
        className="ft-btn ft-btn--primary ft-btn--block"
      >
        View Progress
      </motion.button>
    </motion.div>
  );
}

function StatPill({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-muted/50 border border-border px-2 py-3">
      <Icon className="h-3.5 w-3.5 text-muted-foreground mx-auto mb-1" />
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-sm font-bold tabular-nums text-foreground mt-0.5">{value}</p>
    </div>
  );
}
