'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Timer, X, Plus, Minus } from 'lucide-react';
import { playBeep, showLocalNotification, formatCountdownHMS } from '@/workout/utils';
import { REST_TIMER_OPTIONS } from '@/workout/constants';
import { cn } from '@/lib/utils';

const POS_STORAGE_KEY = 'ft-rest-timer-pos';

interface RestTimerProps {
  endTime: number | null;
  defaultSeconds: number;
  soundEnabled: boolean;
  onComplete: () => void;
  onDurationChange: (seconds: number) => void;
  onClose: () => void;
}

function loadSavedPosition(): { x: number; y: number } {
  if (typeof window === 'undefined') return { x: 16, y: 80 };
  try {
    const raw = localStorage.getItem(POS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { x: number; y: number };
      if (typeof parsed.x === 'number' && typeof parsed.y === 'number') return parsed;
    }
  } catch {
    /* ignore */
  }
  return { x: 16, y: 80 };
}

export function RestTimer({
  endTime,
  defaultSeconds,
  soundEnabled,
  onComplete,
  onDurationChange,
  onClose,
}: RestTimerProps) {
  const [remaining, setRemaining] = useState(0);
  const [overtime, setOvertime] = useState(0);
  const [borderProgress, setBorderProgress] = useState(1);
  const [expanded, setExpanded] = useState(false);
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
  const timerSession = useRef<{ endTime: number; startedAt: number } | null>(null);

  useEffect(() => {
    if (!endTime) {
      timerSession.current = null;
      setRemaining(0);
      setOvertime(0);
      setBorderProgress(1);
      setExpanded(false);
      return;
    }
    const existing = timerSession.current;
    if (!existing) {
      timerSession.current = { endTime, startedAt: Date.now() };
    } else {
      timerSession.current = { startedAt: existing.startedAt, endTime };
    }
    const tick = () => {
      const now = Date.now();
      const left = Math.ceil((endTime - now) / 1000);
      setRemaining(left);
      setOvertime(left < 0 ? Math.abs(left) : 0);
      const session = timerSession.current;
      if (session && left > 0) {
        const total = session.endTime - session.startedAt;
        setBorderProgress(total > 0 ? Math.max(0, Math.min(1, (endTime - now) / total)) : 0);
      } else {
        setBorderProgress(0);
      }

      if (soundEnabled && left > 0 && left <= 3 && left !== remaining) {
        playBeep(440, 0.1);
      }
      if (left === 0 && remaining === 1) {
        if (soundEnabled) playBeep(880, 0.5);
        void showLocalNotification('Rest Complete!', 'Time for your next set.');
        onComplete();
      }
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [endTime, soundEnabled, remaining, onComplete]);

  const clampPosition = useCallback((x: number, y: number) => {
    const margin = 8;
    const width = expanded ? 280 : 160;
    const height = expanded ? 220 : 52;
    const maxX = Math.max(margin, window.innerWidth - width - margin);
    const maxY = Math.max(margin, window.innerHeight - height - margin);
    return {
      x: Math.min(Math.max(margin, x), maxX),
      y: Math.min(Math.max(margin, y), maxY),
    };
  }, [expanded]);

  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
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
    if (!dragRef.current.moved) setExpanded((v) => !v);
    dragRef.current.active = false;
  };

  useEffect(() => {
    setPos((prev) => clampPosition(prev.x, prev.y));
  }, [expanded, clampPosition]);

  useEffect(() => {
    try {
      localStorage.setItem(POS_STORAGE_KEY, JSON.stringify(pos));
    } catch {
      /* ignore */
    }
  }, [pos]);

  if (!endTime) return null;

  const isOvertime = remaining <= 0;
  const displaySeconds = isOvertime ? overtime : remaining;

  return (
    <div
      className="ft-rest-float"
      style={{ left: pos.x, top: pos.y }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div
        className={cn(
          'ft-rest-float-ring',
          isOvertime && 'ft-rest-float-ring--overtime',
          expanded && 'ft-rest-float-ring--expanded'
        )}
        style={{ '--ft-rest-progress': borderProgress } as React.CSSProperties}
      >
      <div
        className={cn(
          'ft-rest-float-pill',
          isOvertime && 'ft-rest-float-pill--overtime',
          expanded && 'ft-rest-float-pill--expanded'
        )}
      >
        <button
          type="button"
          onClick={onClose}
          className="ft-rest-float-close"
          aria-label="Close rest timer"
        >
          <X className="h-3.5 w-3.5" />
        </button>

        <div className="ft-rest-float-display">
          <Timer className="h-4 w-4 shrink-0 opacity-70" />
          <span className="ft-rest-float-time tabular-nums">
            {isOvertime ? '+' : ''}
            {formatCountdownHMS(displaySeconds)}
          </span>
        </div>

        {expanded && (
          <div className="ft-rest-float-controls">
            <p className="text-xs font-semibold text-muted-foreground text-center">
              {isOvertime ? 'Overtime' : 'Rest Timer'}
            </p>

            <div className="flex flex-wrap justify-center gap-1.5">
              {REST_TIMER_OPTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => onDurationChange(s)}
                  className={cn('ft-chip text-xs py-1 px-2', defaultSeconds === s && 'ft-chip--active')}
                >
                  {s}s
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onDurationChange(Math.max(5, defaultSeconds - 15))}
                className="ft-btn ft-btn--secondary flex-1 text-xs py-2"
              >
                <Minus className="h-3.5 w-3.5" />
                15s
              </button>
              <button
                type="button"
                onClick={() => onDurationChange(defaultSeconds + 15)}
                className="ft-btn ft-btn--secondary flex-1 text-xs py-2"
              >
                <Plus className="h-3.5 w-3.5" />
                15s
              </button>
            </div>

            <button type="button" onClick={onClose} className="ft-btn ft-btn--primary ft-btn--block text-xs py-2">
              {isOvertime ? "I'm Ready" : 'Skip Rest'}
            </button>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
