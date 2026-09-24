'use client';

import { useEffect, useRef, useState } from 'react';
import { Camera, Minus, Plus, SwitchCamera, TriangleAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { usePoseRepCounter } from '@/hooks/usePoseRepCounter';
import { LM, poseRepTempo, repProgress } from '@/workout/poseRepCounter';
import type { PoseLandmark, PoseRepSpec } from '@/workout/poseRepCounter';
import { requestWakeLock, releaseWakeLock } from '@/lib/wakeLock';

interface PoseRepCounterModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  spec: PoseRepSpec | null;
  /** Exercise name as the user sees it, which may differ from the spec label. */
  exerciseName: string;
  /** Reps on the matching set last time, shown as the number to beat. */
  ghost?: number | null;
  /** Receives the confirmed count - never called automatically. */
  onConfirm: (count: number) => void;
}

/** Bones drawn on the overlay: torso, arms, legs. */
const SKELETON: [number, number][] = [
  [LM.leftShoulder, LM.rightShoulder],
  [LM.leftShoulder, LM.leftHip],
  [LM.rightShoulder, LM.rightHip],
  [LM.leftHip, LM.rightHip],
  [LM.leftShoulder, LM.leftElbow],
  [LM.leftElbow, LM.leftWrist],
  [LM.rightShoulder, LM.rightElbow],
  [LM.rightElbow, LM.rightWrist],
  [LM.leftHip, LM.leftKnee],
  [LM.leftKnee, LM.leftAnkle],
  [LM.rightHip, LM.rightKnee],
  [LM.rightKnee, LM.rightAnkle],
];

const QUALITY_COPY = {
  good: { label: 'Tracking you', tone: 'ft-pace-ahead' },
  weak: { label: 'Partly hidden - step back so more of you is in frame', tone: 'ft-pace-behind' },
  lost: { label: 'Cannot see you - step into frame', tone: 'text-muted-foreground' },
} as const;

/**
 * Draws the tracked skeleton over the video.
 *
 * Worth the pixels: without it there is no way to tell a miscount from bad
 * framing, and bad framing is the cause nearly every time.
 */
function SkeletonOverlay({
  landmarks,
  mirrored,
  highlight,
}: {
  landmarks: PoseLandmark[];
  mirrored: boolean;
  highlight: readonly number[] | null;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);
    if (landmarks.length === 0) return;

    const px = (lm: PoseLandmark) => ({
      x: (mirrored ? 1 - lm.x : lm.x) * width,
      y: lm.y * height,
    });
    const seen = (i: number) => (landmarks[i]?.visibility ?? 0) >= 0.5;

    ctx.lineCap = 'round';
    for (const [a, b] of SKELETON) {
      if (!landmarks[a] || !landmarks[b] || !seen(a) || !seen(b)) continue;
      const onTrackedJoint =
        highlight !== null && highlight.includes(a) && highlight.includes(b);
      const pa = px(landmarks[a]);
      const pb = px(landmarks[b]);
      ctx.strokeStyle = onTrackedJoint ? '#f59e0b' : 'rgba(255,255,255,0.75)';
      ctx.lineWidth = onTrackedJoint ? 5 : 3;
      ctx.beginPath();
      ctx.moveTo(pa.x, pa.y);
      ctx.lineTo(pb.x, pb.y);
      ctx.stroke();
    }

    for (let i = 0; i < landmarks.length; i += 1) {
      if (!seen(i)) continue;
      const isTracked = highlight !== null && highlight.includes(i);
      // Only the joints that are part of a drawn bone, plus the tracked ones.
      if (!isTracked && !SKELETON.some(([a, b]) => a === i || b === i)) continue;
      const p = px(landmarks[i]);
      ctx.fillStyle = isTracked ? '#f59e0b' : 'rgba(255,255,255,0.9)';
      ctx.beginPath();
      ctx.arc(p.x, p.y, isTracked ? 5 : 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [landmarks, mirrored, highlight]);

  return (
    <canvas
      ref={canvasRef}
      width={640}
      height={480}
      className="absolute inset-0 h-full w-full"
      aria-hidden="true"
    />
  );
}

export function PoseRepCounterModal({
  open,
  onOpenChange,
  spec,
  exerciseName,
  ghost = null,
  onConfirm,
}: PoseRepCounterModalProps) {
  const [autoStopped, setAutoStopped] = useState(false);
  const counter = usePoseRepCounter({
    spec,
    onAutoStop: () => setAutoStopped(true),
  });
  const { state, status, errorMessage, landmarks, facing, start, stop, adjust, flipCamera, videoRef } =
    counter;

  useEffect(() => {
    if (!open) {
      stop();
      setAutoStopped(false);
      releaseWakeLock();
    }
  }, [open, stop]);

  const running = status === 'running';
  const tempo = poseRepTempo(state);
  const beatsGhost = ghost !== null && state.count > ghost;
  const quality = QUALITY_COPY[state.quality];
  const progress = spec ? repProgress(state, spec) : 0;
  const tracked = spec ? (state.side === 'right' ? spec.joints.right : spec.joints.left) : null;

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
          <DialogTitle>Auto rep counter</DialogTitle>
          <DialogDescription>
            {exerciseName} · counted from your joint angles. Nothing is recorded or uploaded.
          </DialogDescription>
        </DialogHeader>

        {!spec && (
          <div className="space-y-4">
            <div className="ft-card p-4 flex gap-3">
              <TriangleAlert className="h-5 w-5 ft-pace-behind shrink-0 mt-0.5" aria-hidden="true" />
              <div className="text-sm">
                <p className="font-medium">{exerciseName} cannot be counted by camera.</p>
                <p className="text-muted-foreground mt-1">
                  Holds and twists have no joint angle that swings cleanly, so a count would be
                  guesswork. Type the number in instead.
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

        {spec && status === 'idle' && (
          <div className="space-y-4">
            <div className="ft-card p-4 flex gap-3">
              <Camera className="h-5 w-5 text-primary shrink-0 mt-0.5" aria-hidden="true" />
              <div className="text-sm text-muted-foreground space-y-1">
                <p className="text-foreground font-medium">Where to put the phone</p>
                <p>{spec.cameraHint}</p>
                <p className="text-foreground font-medium pt-1">What counts</p>
                <p>
                  {spec.formHint} Your first two reps set the standard; anything much shorter after
                  that does not count.
                </p>
                <p className="pt-1">It counts out loud, so you never need to look at the screen.</p>
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

        {status === 'loading' && (
          <p className="text-sm text-muted-foreground py-8 text-center">
            Loading the pose model…
            <span className="block text-xs mt-1">First time only — it is cached after this.</span>
          </p>
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

        {/* The stream feeds the pose model and this preview, and nothing else. */}
        <div className={cn('relative overflow-hidden rounded-xl bg-black', !running && 'hidden')}>
          <video
            ref={videoRef}
            playsInline
            muted
            className={cn('w-full aspect-[4/3] object-cover', facing === 'user' && 'scale-x-[-1]')}
          />
          <SkeletonOverlay
            landmarks={landmarks}
            mirrored={facing === 'user'}
            highlight={tracked}
          />
          <div className="absolute top-2 left-3 right-3 flex items-start justify-between gap-2">
            <span
              className="text-5xl font-black tabular-nums leading-none text-white drop-shadow-lg"
              aria-live="polite"
            >
              {state.count}
            </span>
            <button
              type="button"
              className="rounded-full bg-black/50 p-2 text-white"
              onClick={() => void flipCamera()}
              aria-label="Switch camera"
            >
              <SwitchCamera className="h-4 w-4" />
            </button>
          </div>
          {/* Depth bar: fills as you descend, so bad range is visible at a glance. */}
          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/20">
            <div
              className="h-full bg-amber-400 transition-[width] duration-75"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
        </div>

        {running && (
          <div className="space-y-3">
            <p className="text-center text-sm text-muted-foreground">
              {state.phase === 'low' ? 'Bottom' : 'Top'}
              {tempo !== null && ` · ${tempo}s per rep`}
              {state.calibratedRange === null && ' · setting your range'}
            </p>

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

            {ghost !== null && ghost > 0 && (
              <p className="text-center text-sm">
                <span className="text-muted-foreground">
                  Last time: <span className="font-semibold tabular-nums">{ghost}</span>
                </span>
                {beatsGhost && (
                  <span className="ft-pace-ahead font-bold"> · +{state.count - ghost}</span>
                )}
              </p>
            )}

            <p className={cn('text-center text-xs', quality.tone)}>{quality.label}</p>

            {state.lastRepRejected && !state.formBroken && (
              <p className="text-center text-sm ft-pace-behind font-semibold">
                Too shallow — didn&apos;t count. {spec?.formHint}
              </p>
            )}

            {state.formBroken ? (
              <p className="text-center text-sm ft-pace-behind font-medium">
                Last reps came up short of range — that is your set. Good stopping point.
              </p>
            ) : (
              state.shallowReps > 0 &&
              !state.lastRepRejected && (
                <p className="text-center text-xs text-muted-foreground">
                  {state.shallowReps} {state.shallowReps === 1 ? 'rep' : 'reps'} didn&apos;t count —
                  too shallow
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
              Use {state.count} reps
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
