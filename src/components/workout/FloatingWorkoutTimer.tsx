'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Timer } from 'lucide-react';
import { formatCountdownHMS } from '@/workout/utils';

const POS_STORAGE_KEY = 'ft-workout-timer-pos';

interface FloatingWorkoutTimerProps {
  startedAt: number;
  splitName: string;
  workoutHref?: string;
}

function loadSavedPosition(): { x: number; y: number } {
  if (typeof window === 'undefined') return { x: 16, y: 120 };
  try {
    const raw = localStorage.getItem(POS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { x: number; y: number };
      if (typeof parsed.x === 'number' && typeof parsed.y === 'number') return parsed;
    }
  } catch {
    /* ignore */
  }
  return {
    x: Math.max(16, window.innerWidth - 200),
    y: Math.max(80, window.innerHeight - 140),
  };
}

export function FloatingWorkoutTimer({
  startedAt,
  splitName,
  workoutHref = '/fittrack/workout',
}: FloatingWorkoutTimerProps) {
  const router = useRouter();
  const [elapsed, setElapsed] = useState(0);
  const [pos, setPos] = useState(loadSavedPosition);
  const dragRef = useRef({
    active: false,
    moved: false,
    pointerId: -1,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
  });

  useEffect(() => {
    const tick = () => setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  const clampPosition = useCallback((x: number, y: number) => {
    const margin = 8;
    const width = 190;
    const height = 56;
    const maxX = Math.max(margin, window.innerWidth - width - margin);
    const maxY = Math.max(margin, window.innerHeight - height - margin);
    return {
      x: Math.min(Math.max(margin, x), maxX),
      y: Math.min(Math.max(margin, y), maxY),
    };
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    dragRef.current = {
      active: true,
      moved: false,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      originX: pos.x,
      originY: pos.y,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current.active || dragRef.current.pointerId !== e.pointerId) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) dragRef.current.moved = true;
    setPos(clampPosition(dragRef.current.originX + dx, dragRef.current.originY + dy));
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!dragRef.current.active || dragRef.current.pointerId !== e.pointerId) return;
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    if (!dragRef.current.moved) router.push(workoutHref);
    dragRef.current.active = false;
  };

  useEffect(() => {
    setPos((prev) => clampPosition(prev.x, prev.y));
  }, [clampPosition]);

  useEffect(() => {
    try {
      localStorage.setItem(POS_STORAGE_KEY, JSON.stringify(pos));
    } catch {
      /* ignore */
    }
  }, [pos]);

  return (
    <div
      className="ft-workout-float"
      style={{ left: pos.x, top: pos.y }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      role="button"
      tabIndex={0}
      aria-label={`Workout in progress: ${splitName}, ${formatCountdownHMS(elapsed)} elapsed. Tap to open workout.`}
    >
      <div className="ft-workout-float-pill">
        <Timer className="h-4 w-4 shrink-0 text-primary" />
        <div className="min-w-0">
          <p className="ft-workout-float-label truncate">{splitName}</p>
          <p className="ft-workout-float-time tabular-nums">{formatCountdownHMS(elapsed)}</p>
        </div>
      </div>
    </div>
  );
}
