'use client';

import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import {
  BODY_FRONT,
  BODY_BACK,
  FRONT_VIEWBOX,
  BACK_VIEWBOX,
  type BodyRegion,
} from '@/workout/bodyPaths';
import { getSubMuscleName, type MuscleState, type SubMuscleId } from '@/workout/muscleCoverage';
import { cn } from '@/lib/utils';

/**
 * Anatomical muscle body map — ONE figure that flips front/back with a 3D
 * animation (design picked by the user from anatomy-previews). Pure SVG + CSS:
 * no 3D library, no lag. Swipe or tap Front/Back to flip; +/− to zoom.
 */

const STATE_FILL: Record<MuscleState, string> = {
  covered: '#22c55e',
  secondary: '#86efac',
  pending: '#ef4444',
  idle: '#cdd2d9',
};

const NEUTRAL_FILL = '#e9ebee';
const HAIR_FILL = '#c3c9d1';
const STROKE = '#9aa2ad';

/** Body parts that are never colored (not muscles). */
const NEUTRAL = new Set(['head', 'hair', 'neck', 'hands', 'ankles', 'feet', 'knees']);

/**
 * Artwork region → our sub-muscle taxonomy. Regions showing several
 * sub-muscles take the "best" state among them (covered > secondary > pending).
 * The deltoid artwork differs per view: front shows front+side, back shows rear+side.
 * Chest and abs are split into bands separately (see BANDS below).
 */
const REGION_TO_MUSCLES: Record<string, SubMuscleId[]> = {
  obliques: ['obliques'],
  biceps: ['biceps'],
  triceps: ['triceps-long', 'triceps-lateral'],
  trapezius: ['traps'],
  'deltoids@front': ['front-delts', 'side-delts'],
  'deltoids@back': ['rear-delts', 'side-delts'],
  adductors: ['adductors'],
  quadriceps: ['quads'],
  tibialis: ['calves'],
  calves: ['calves'],
  forearm: ['forearms'],
  'upper-back': ['lats', 'mid-back'],
  'lower-back': ['lower-back'],
  gluteal: ['glutes'],
  hamstring: ['hamstrings'],
};

/** Horizontal clip bands splitting one artwork region into sub-muscle zones. */
const BANDS: Record<string, { muscle: SubMuscleId; from: number; to: number }[]> = {
  chest: [
    { muscle: 'chest-upper', from: 0, to: 0.38 },
    { muscle: 'chest-mid', from: 0.38, to: 0.72 },
    { muscle: 'chest-lower', from: 0.72, to: 1 },
  ],
  abs: [
    { muscle: 'abs-upper', from: 0, to: 0.55 },
    { muscle: 'abs-lower', from: 0.55, to: 1 },
  ],
};

type Rect = { x: number; y: number; width: number; height: number };

function resolveState(
  muscles: SubMuscleId[],
  states: Record<SubMuscleId, MuscleState>
): MuscleState {
  let secondary = false;
  let pending = false;
  for (const m of muscles) {
    const s = states[m] ?? 'idle';
    if (s === 'covered') return 'covered';
    if (s === 'secondary') secondary = true;
    if (s === 'pending') pending = true;
  }
  if (secondary) return 'secondary';
  if (pending) return 'pending';
  return 'idle';
}

function RegionPaths({
  region,
  fill,
  highlighted,
  clipPath,
  onClick,
}: {
  region: BodyRegion;
  fill: string;
  highlighted?: boolean;
  clipPath?: string;
  onClick?: () => void;
}) {
  return (
    <g
      clipPath={clipPath}
      className={onClick ? 'cursor-pointer' : undefined}
      onClick={onClick}
      style={highlighted ? { filter: 'brightness(1.2) saturate(1.3)' } : undefined}
    >
      {region.paths.map((d, i) => (
        <path
          key={i}
          d={d}
          fill={fill}
          stroke={STROKE}
          strokeWidth={1.5}
          style={{ transition: 'fill 0.25s ease' }}
        />
      ))}
    </g>
  );
}

function BodyView({
  view,
  regions,
  viewBox,
  states,
  highlightSet,
  onMuscleClick,
}: {
  view: 'front' | 'back';
  regions: BodyRegion[];
  viewBox: string;
  states: Record<SubMuscleId, MuscleState>;
  highlightSet: Set<SubMuscleId>;
  onMuscleClick?: (muscles: SubMuscleId[], label: string) => void;
}) {
  const bandGroupRefs = useRef<Record<string, SVGGElement | null>>({});
  const [bandRects, setBandRects] = useState<Record<string, Rect>>({});

  // Measure banded regions (chest/abs) once to place their clip rectangles.
  useLayoutEffect(() => {
    const rects: Record<string, Rect> = {};
    for (const slug of Object.keys(BANDS)) {
      const g = bandGroupRefs.current[slug];
      if (g) {
        const bb = g.getBBox();
        rects[slug] = { x: bb.x, y: bb.y, width: bb.width, height: bb.height };
      }
    }
    if (Object.keys(rects).length) setBandRects(rects);
  }, []);

  const isHighlighted = (muscles: SubMuscleId[]) => muscles.some((m) => highlightSet.has(m));

  return (
    <svg viewBox={viewBox} className="block h-auto w-full" role="img" aria-label={`${view} muscle map`}>
      {regions.map((region) => {
        // Neutral scaffold parts (head, hands, ...)
        if (NEUTRAL.has(region.slug)) {
          return (
            <RegionPaths
              key={region.slug}
              region={region}
              fill={region.slug === 'hair' ? HAIR_FILL : NEUTRAL_FILL}
            />
          );
        }

        // Banded regions: base layer (measured) + one clipped copy per band
        const bands = view === 'front' ? BANDS[region.slug] : undefined;
        if (bands) {
          const rect = bandRects[region.slug];
          return (
            <g key={region.slug}>
              <g ref={(el) => { bandGroupRefs.current[region.slug] = el; }}>
                <RegionPaths region={region} fill={STATE_FILL.idle} />
              </g>
              {rect &&
                bands.map((band, i) => (
                  <g key={band.muscle}>
                    <clipPath id={`${region.slug}-band-${i}`}>
                      <rect
                        x={rect.x - 4}
                        width={rect.width + 8}
                        y={rect.y + rect.height * band.from}
                        height={rect.height * (band.to - band.from)}
                      />
                    </clipPath>
                    <RegionPaths
                      region={region}
                      fill={STATE_FILL[states[band.muscle] ?? 'idle']}
                      highlighted={highlightSet.has(band.muscle)}
                      clipPath={`url(#${region.slug}-band-${i})`}
                      onClick={
                        onMuscleClick &&
                        (() => onMuscleClick([band.muscle], getSubMuscleName(band.muscle)))
                      }
                    />
                  </g>
                ))}
            </g>
          );
        }

        const key = region.slug === 'deltoids' ? `deltoids@${view}` : region.slug;
        const muscles = REGION_TO_MUSCLES[key] ?? [];
        return (
          <RegionPaths
            key={region.slug}
            region={region}
            fill={STATE_FILL[resolveState(muscles, states)]}
            highlighted={isHighlighted(muscles)}
            onClick={
              onMuscleClick && muscles.length > 0
                ? () => onMuscleClick(muscles, muscles.map(getSubMuscleName).join(' · '))
                : undefined
            }
          />
        );
      })}
    </svg>
  );
}

export interface MuscleBodyMapProps {
  states: Record<SubMuscleId, MuscleState>;
  /** Sub-muscles to glow (e.g. previewing a suggested exercise). */
  highlight?: SubMuscleId[];
  /** Tap on a muscle region — receives its sub-muscles and a display label. */
  onMuscleClick?: (muscles: SubMuscleId[], label: string) => void;
}

const MIN_ZOOM = 0.6;
const MAX_ZOOM = 3;
const clampZoom = (z: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));

export function MuscleBodyMap({ states, highlight = [], onMuscleClick }: MuscleBodyMapProps) {
  const [showingBack, setShowingBack] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [gesturing, setGesturing] = useState(false);
  const highlightSet = useMemo(() => new Set(highlight), [highlight]);

  // Refs mirror the transform state so gesture handlers always read current
  // values (avoids stale closures during rapid pointermove events).
  const containerRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef(1);
  const panRef = useRef({ x: 0, y: 0 });
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef({
    startX: 0,
    startY: 0,
    startPanX: 0,
    startPanY: 0,
    startDist: 0,
    startZoom: 1,
    moved: false,
    mode: 'none' as 'none' | 'pan' | 'pinch' | 'swipe',
  });
  const movedRef = useRef(false); // suppress the click that follows a drag/pinch

  const applyZoom = (z: number) => {
    zoomRef.current = z;
    setZoom(z);
  };
  const applyPan = (p: { x: number; y: number }) => {
    panRef.current = p;
    setPan(p);
  };

  /** Keep the (translated) figure within reach — but let the head/feet edges be
   *  pannable once it overflows, so zooming no longer traps you in the middle. */
  const clampPan = (x: number, y: number, z: number) => {
    const container = containerRef.current;
    const body = bodyRef.current;
    if (!container || !body) return { x, y };
    const overflowX = Math.max(0, (body.offsetWidth * z - container.clientWidth) / 2);
    const overflowY = Math.max(0, (body.offsetHeight * z - container.clientHeight) / 2);
    const maxX = overflowX > 0 ? overflowX + 24 : 0;
    const maxY = overflowY > 0 ? overflowY + 32 : 0;
    return {
      x: Math.min(maxX, Math.max(-maxX, x)),
      y: Math.min(maxY, Math.max(-maxY, y)),
    };
  };

  const zoomBy = (factor: number) => {
    const z = clampZoom(zoomRef.current * factor);
    applyZoom(z);
    applyPan(clampPan(panRef.current.x, panRef.current.y, z));
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Clear any stale "was a drag" flag from a previous gesture that never
    // emitted a click — otherwise it would swallow this fresh tap.
    movedRef.current = false;
    // Let the on-screen controls (zoom / front-back) handle their own taps.
    if ((e.target as HTMLElement).closest('button')) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesture.current;
    if (pointers.current.size === 2) {
      const [p1, p2] = Array.from(pointers.current.values());
      g.startDist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      g.startZoom = zoomRef.current;
      g.mode = 'pinch';
      g.moved = true;
      setGesturing(true);
    } else {
      g.startX = e.clientX;
      g.startY = e.clientY;
      g.startPanX = panRef.current.x;
      g.startPanY = panRef.current.y;
      g.moved = false;
      g.mode = zoomRef.current > 1 ? 'pan' : 'swipe';
    }
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesture.current;

    // Two fingers → pinch zoom.
    if (pointers.current.size >= 2 && g.mode === 'pinch') {
      const [p1, p2] = Array.from(pointers.current.values());
      const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      if (g.startDist > 0) {
        const z = clampZoom(g.startZoom * (dist / g.startDist));
        applyZoom(z);
        applyPan(clampPan(panRef.current.x, panRef.current.y, z));
      }
      return;
    }

    // One finger.
    const dx = e.clientX - g.startX;
    const dy = e.clientY - g.startY;
    if (!g.moved && Math.hypot(dx, dy) > 8) {
      g.moved = true;
      if (g.mode === 'pan') setGesturing(true);
    }
    if (g.mode === 'pan' && g.moved) {
      applyPan(clampPan(g.startPanX + dx, g.startPanY + dy, zoomRef.current));
    }
  };

  const onPointerEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(e.pointerId)) return;
    const g = gesture.current;
    const wasMulti = pointers.current.size >= 2;
    pointers.current.delete(e.pointerId);

    // Swipe left/right to flip — only when not zoomed in.
    if (g.mode === 'swipe' && zoomRef.current <= 1 && !wasMulti) {
      const dx = e.clientX - g.startX;
      const dy = e.clientY - g.startY;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
        setShowingBack((b) => !b);
        g.moved = true;
      }
    }
    movedRef.current = g.moved;

    if (pointers.current.size === 0) {
      g.mode = 'none';
      setGesturing(false);
    } else if (pointers.current.size === 1) {
      // Lifting one finger of a pinch → continue as a single-finger pan.
      const remaining = Array.from(pointers.current.values())[0];
      g.startX = remaining.x;
      g.startY = remaining.y;
      g.startPanX = panRef.current.x;
      g.startPanY = panRef.current.y;
      g.mode = zoomRef.current > 1 ? 'pan' : 'swipe';
      g.moved = false;
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative flex justify-center overflow-hidden rounded-2xl px-2 pb-12 pt-4"
      style={{
        background: 'linear-gradient(180deg, #f4f5f7 0%, #e9ebef 100%)',
        perspective: '1200px',
        // Give ourselves full control of touch once zoomed; otherwise let the
        // page scroll vertically (horizontal swipe-to-flip still reaches us).
        touchAction: zoom > 1 ? 'none' : 'pan-y',
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      onClickCapture={(e) => {
        if (movedRef.current) {
          e.stopPropagation();
          e.preventDefault();
          movedRef.current = false;
        }
      }}
    >
      {/* View indicator */}
      <span className="pointer-events-none absolute left-3 top-3 z-10 rounded-full border border-[#d3d8de] bg-white/85 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-[#5b6570]">
        {showingBack ? 'Back View' : 'Front View'}
      </span>

      {/* Zoom controls */}
      <div className="absolute right-3 top-3 z-10 flex flex-col gap-1.5">
        <button
          type="button"
          onClick={() => zoomBy(1.2)}
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#d3d8de] bg-white/85 text-[#33404d] transition-colors hover:bg-white"
          aria-label="Zoom in"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => zoomBy(1 / 1.2)}
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#d3d8de] bg-white/85 text-[#33404d] transition-colors hover:bg-white"
          aria-label="Zoom out"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Flipping body — pinch to zoom, drag to pan */}
      <div
        ref={bodyRef}
        className="relative w-44 select-none sm:w-52"
        style={{
          transformStyle: 'preserve-3d',
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom}) rotateY(${showingBack ? 180 : 0}deg)`,
          transition: gesturing ? 'none' : 'transform 0.6s cubic-bezier(0.4, 0.05, 0.2, 1)',
          willChange: 'transform',
        }}
      >
        <div style={{ backfaceVisibility: 'hidden' }}>
          <BodyView
            view="front"
            regions={BODY_FRONT}
            viewBox={FRONT_VIEWBOX}
            states={states}
            highlightSet={highlightSet}
            onMuscleClick={onMuscleClick}
          />
        </div>
        <div
          className="absolute inset-0"
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
        >
          <BodyView
            view="back"
            regions={BODY_BACK}
            viewBox={BACK_VIEWBOX}
            states={states}
            highlightSet={highlightSet}
            onMuscleClick={onMuscleClick}
          />
        </div>
      </div>

      {/* Front/Back snap */}
      <div className="absolute bottom-2.5 left-1/2 z-10 flex -translate-x-1/2 gap-1 rounded-xl border border-[#d3d8de] bg-white/85 p-1">
        {(['front', 'back'] as const).map((view) => {
          const active = (view === 'back') === showingBack;
          return (
            <button
              key={view}
              type="button"
              onClick={() => setShowingBack(view === 'back')}
              className={cn(
                'rounded-lg px-4 py-1 text-[9px] font-black uppercase tracking-widest transition-colors',
                active ? 'bg-primary text-white' : 'text-[#5b6570] hover:text-[#33404d]'
              )}
            >
              {view}
            </button>
          );
        })}
      </div>
    </div>
  );
}
