'use client';

import { useEffect, useState } from 'react';
import { Camera, Minus, Plus, Smartphone, TriangleAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useCameraRepCounter } from '@/hooks/useCameraRepCounter';
import { repTempo } from '@/workout/repCounter';
import { formatTargetValue } from '@/workout/targets';
import type { TargetUnit } from '@/workout/targets';
import { requestWakeLock, releaseWakeLock } from '@/lib/wakeLock';

interface RepCounterModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Last session's top set, shown as the number to beat. */
  ghost: number | null;
  allTimeBest: number;
  unit: TargetUnit;
  /** Receives the confirmed count — never called automatically. */
  onConfirm: (count: number) => void;
}

const QUALITY_COPY = {
  good: { label: 'Signal good', tone: 'ft-pace-ahead' },
  weak: { label: 'Signal weak — more light, or lower your chest', tone: 'ft-pace-behind' },
  lost: { label: 'No signal — put the phone under your chest', tone: 'text-muted-foreground' },
} as const;

export function RepCounterModal({
  open,
  onOpenChange,
  ghost,
  allTimeBest,
  unit,
  onConfirm,
}: RepCounterModalProps) {
  const [autoStopped, setAutoStopped] = useState(false);
  const counter = useCameraRepCounter({ onAutoStop: () => setAutoStopped(true) });
  const { state, status, errorMessage, start, stop, adjust, videoRef } = counter;

  useEffect(() => {
    if (!open) {
      stop();
      setAutoStopped(false);
      releaseWakeLock();
    }
  }, [open, stop]);

  const running = status === 'running';
  const tempo = repTempo(state);
  const beatsGhost = ghost !== null && state.count > ghost;
  const beatsBest = state.count > allTimeBest;
  const quality = QUALITY_COPY[state.quality];

  const handleStart = async () => {
    setAutoStopped(false);
    await requestWakeLock();
    await start();
  };

  const handleFinish = () => {
    stop();
    releaseWakeLock();
    onConfirm(state.count);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Camera rep counter</DialogTitle>
          <DialogDescription>
            Phone flat on the floor, screen up, under your chest. Nothing is recorded or uploaded.
          </DialogDescription>
        </DialogHeader>

        {/* The stream only ever feeds the brightness sampler. */}
        <video ref={videoRef} playsInline muted className="hidden" />

        {status === 'idle' && (
          <div className="space-y-4">
            <div className="ft-card p-4 flex gap-3">
              <Smartphone className="h-5 w-5 text-primary shrink-0 mt-0.5" aria-hidden="true" />
              <div className="text-sm text-muted-foreground space-y-1">
                <p className="text-foreground font-medium">How it works</p>
                <p>
                  At the bottom of each rep your chest blocks the light reaching the front camera.
                  The first few reps set your depth standard; anything much shallower after that
                  gets flagged, and the set ends when two in a row fall short.
                </p>
                <p>It counts out loud, so you never need to look at the screen.</p>
              </div>
            </div>
            <button
              type="button"
              className="ft-btn ft-btn--primary ft-btn--block ft-btn--lg"
              onClick={handleStart}
            >
              <Camera className="h-4 w-4" />
              Start counting
            </button>
          </div>
        )}

        {status === 'starting' && (
          <p className="text-sm text-muted-foreground py-8 text-center">Opening the camera…</p>
        )}

        {(status === 'denied' || status === 'unsupported' || status === 'error') && (
          <div className="space-y-4">
            <div className="ft-card p-4 flex gap-3">
              <TriangleAlert className="h-5 w-5 ft-pace-behind shrink-0 mt-0.5" aria-hidden="true" />
              <div className="text-sm">
                <p className="font-medium">{errorMessage}</p>
                <p className="text-muted-foreground mt-1">
                  No problem — close this and type your count in instead.
                </p>
              </div>
            </div>
            <button
              type="button"
              className="ft-btn ft-btn--secondary ft-btn--block"
              onClick={() => onOpenChange(false)}
            >
              Enter it manually
            </button>
          </div>
        )}

        {running && (
          <div className="space-y-4">
            <div className="text-center py-2">
              <p
                className={cn(
                  'text-7xl font-black tabular-nums leading-none',
                  beatsBest && 'text-amber-500'
                )}
                aria-live="polite"
              >
                {state.count}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                {state.phase === 'down' ? 'Down' : 'Up'}
                {tempo !== null && ` · ${tempo}s per rep`}
              </p>
            </div>

            {/* Rep dots */}
            {state.count > 0 && (
              <div className="flex flex-wrap gap-1.5 justify-center">
                {Array.from({ length: Math.min(state.count, 60) }, (_, i) => (
                  <span
                    key={i}
                    className={cn(
                      'h-2 w-2 rounded-full',
                      ghost !== null && i >= ghost ? 'bg-amber-500' : 'bg-primary'
                    )}
                  />
                ))}
              </div>
            )}

            {ghost !== null && (
              <p className="text-center text-sm">
                <span className="text-muted-foreground">
                  Last time: <span className="font-semibold tabular-nums">{formatTargetValue(ghost, unit)}</span>
                </span>
                {beatsGhost && (
                  <span className="ft-pace-ahead font-bold"> · +{state.count - ghost}</span>
                )}
              </p>
            )}

            <p className={cn('text-center text-xs', quality.tone)}>{quality.label}</p>

            {state.formBroken ? (
              <p className="text-center text-sm ft-pace-behind font-medium">
                Last reps came up short of depth — that is your set. Good stopping point.
              </p>
            ) : (
              state.shallowReps > 0 && (
                <p className="text-center text-xs text-muted-foreground">
                  {state.shallowReps} shallow {state.shallowReps === 1 ? 'rep' : 'reps'} so far —
                  chest all the way down
                </p>
              )
            )}

            {autoStopped && !state.formBroken && (
              <p className="text-center text-sm text-muted-foreground">
                No movement for a while — looks like the set is done.
              </p>
            )}

            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                className="ft-btn ft-btn--ghost ft-btn--icon"
                onClick={() => adjust(-1)}
                aria-label="Decrease count"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="text-xs text-muted-foreground">nudge if it miscounted</span>
              <button
                type="button"
                className="ft-btn ft-btn--ghost ft-btn--icon"
                onClick={() => adjust(1)}
                aria-label="Increase count"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            <button
              type="button"
              className="ft-btn ft-btn--primary ft-btn--block ft-btn--lg"
              onClick={handleFinish}
            >
              Use {state.count} {unit === 'seconds' ? 'seconds' : 'reps'}
            </button>
            <p className="text-center text-xs text-muted-foreground">
              You still confirm the number — it is never logged on its own.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
