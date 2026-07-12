'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { MUSCLE_COLORS } from '@/workout/constants';
import { formatRecoveryEta } from '@/workout/recovery';
import {
  BODY_FRONT,
  BODY_BACK,
  FRONT_VIEWBOX,
  BACK_VIEWBOX,
  type BodyRegion,
} from '@/workout/bodyPaths';

const RECOVERY_COLORS = {
  fatigued: '#ef4444',
  recovering: '#f59e0b',
  recovered: '#10b981',
  inactive: '#64748b',
} as const;

type RecoveryStatus = keyof typeof RECOVERY_COLORS;

export interface MuscleData {
  name: string;
  status: RecoveryStatus;
  /** Percent recovered, 0–100. Defaults to 100 (Ready) when absent. */
  recoveryPct?: number;
  /** Hours remaining until fully recovered. */
  etaHours?: number;
  lastTrained?: string;
}

/** Fill opacity scales with recovery so a fatigued muscle reads visibly "not ready". */
function fillOpacity(pct: number): number {
  return 0.4 + 0.6 * (Math.max(0, Math.min(100, pct)) / 100);
}

/**
 * Detailed 2D-anatomy artwork slug → coarse recovery muscle group.
 * Mirrors the taxonomy approach in MuscleBodyMap.tsx (REGION_TO_MUSCLES), but
 * maps onto the 11 recovery groups fed by the dashboard's `recoveryData`.
 * Slugs absent here (e.g. adductors) and neutral scaffold parts render grey.
 */
const SLUG_TO_MUSCLE: Record<string, string> = {
  chest: 'Chest',
  abs: 'Abs',
  obliques: 'Abs',
  biceps: 'Biceps',
  triceps: 'Triceps',
  deltoids: 'Shoulders',
  forearm: 'Forearms',
  quadriceps: 'Quads',
  calves: 'Calves',
  tibialis: 'Calves',
  gluteal: 'Glutes',
  hamstring: 'Hamstrings',
  trapezius: 'Back',
  'upper-back': 'Back',
  'lower-back': 'Back',
};

/** Scaffold parts that are never colored by recovery status. */
const NEUTRAL = new Set(['head', 'hair', 'neck', 'hands', 'ankles', 'feet', 'knees']);

const NEUTRAL_FILL = '#e9ebee';
const HAIR_FILL = '#c3c9d1';
const STROKE = '#9aa2ad';

const MUSCLE_ORDER = [
  'Chest',
  'Back',
  'Shoulders',
  'Biceps',
  'Triceps',
  'Quads',
  'Hamstrings',
  'Glutes',
  'Calves',
  'Abs',
  'Forearms',
] as const;

function statusLabel(status: RecoveryStatus): string {
  if (status === 'fatigued') return 'Fatigued';
  if (status === 'recovering') return 'Recovering';
  if (status === 'recovered') return 'Ready';
  return 'No data';
}

/** One artwork region as an SVG group — colored, optionally clickable + highlighted. */
function RegionShape({
  region,
  fill,
  fillOpacityValue = 1,
  interactive,
  selected,
  label,
  onSelect,
}: {
  region: BodyRegion;
  fill: string;
  fillOpacityValue?: number;
  interactive: boolean;
  selected: boolean;
  label?: string;
  onSelect?: () => void;
}) {
  return (
    <g
      className={interactive ? 'cursor-pointer transition-[filter] duration-200' : undefined}
      onClick={interactive ? onSelect : undefined}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelect?.();
              }
            }
          : undefined
      }
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label={label}
      aria-pressed={interactive ? selected : undefined}
      style={{
        pointerEvents: interactive ? undefined : 'none',
        filter: selected ? 'brightness(1.15) saturate(1.35)' : undefined,
      }}
    >
      {region.paths.map((d, i) => (
        <path
          key={i}
          d={d}
          fill={fill}
          fillOpacity={fillOpacityValue}
          stroke={selected ? '#334155' : STROKE}
          strokeWidth={selected ? 2.5 : 1.5}
          style={{ transition: 'fill 0.25s ease, fill-opacity 0.25s ease' }}
        />
      ))}
    </g>
  );
}

/** A single anatomical figure (front or back), colored by recovery status. */
function BodyFigure({
  view,
  regions,
  viewBox,
  data,
  selected,
  onSelect,
}: {
  view: 'front' | 'back';
  regions: BodyRegion[];
  viewBox: string;
  data: Record<string, MuscleData>;
  selected: string;
  onSelect: (muscle: string) => void;
}) {
  return (
    <div className="min-w-0 flex-1 text-center" style={{ maxWidth: 210 }}>
      <p className="mb-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#7c8694]">
        {view === 'front' ? 'Front' : 'Back'}
      </p>
      <svg
        viewBox={viewBox}
        className="mx-auto block h-auto w-full"
        role="img"
        aria-label={`${view} muscle recovery map`}
      >
        {regions.map((region) => {
          const muscle = SLUG_TO_MUSCLE[region.slug];
          if (!muscle || NEUTRAL.has(region.slug)) {
            return (
              <RegionShape
                key={region.slug}
                region={region}
                fill={region.slug === 'hair' ? HAIR_FILL : NEUTRAL_FILL}
                interactive={false}
                selected={false}
              />
            );
          }
          const info = data[muscle];
          const status = info?.status ?? 'inactive';
          const pct = info?.recoveryPct ?? (status === 'inactive' ? 0 : 100);
          return (
            <RegionShape
              key={region.slug}
              region={region}
              fill={RECOVERY_COLORS[status]}
              fillOpacityValue={fillOpacity(pct)}
              interactive
              selected={selected === muscle}
              label={`${muscle}, ${statusLabel(status)}, ${pct}% recovered`}
              onSelect={() => onSelect(muscle)}
            />
          );
        })}
      </svg>
    </div>
  );
}

function MuscleDetail({ muscle, info }: { muscle: string; info: MuscleData | null }) {
  const accent = MUSCLE_COLORS[muscle] ?? 'hsl(var(--primary))';
  const status = info?.status ?? 'inactive';
  const pct = info?.recoveryPct ?? (status === 'inactive' ? 0 : 100);
  const barColor = RECOVERY_COLORS[status];

  return (
    <div className="rounded-2xl border border-border/60 bg-muted/20 p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span className="mt-1 h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: accent }} />
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Selected</p>
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-lg font-black tracking-tight">{muscle}</p>
            <p className="text-2xl font-black tabular-nums tracking-tighter" style={{ color: barColor }}>
              {pct}%
            </p>
          </div>

          <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted/80">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: barColor }}
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider"
              style={{
                backgroundColor: `${barColor}18`,
                color: barColor,
              }}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: barColor }} />
              {statusLabel(status)}
            </span>
            {info && info.etaHours !== undefined && (
              <span className="text-xs font-bold text-muted-foreground">
                {formatRecoveryEta(info.etaHours)}
              </span>
            )}
          </div>

          {info?.lastTrained ? (
            <p className="mt-2 text-xs font-medium text-muted-foreground">Last trained {info.lastTrained}</p>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">No recent sessions logged — fully rested.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export function MuscleRecoveryMap({ data }: { data: Record<string, MuscleData> }) {
  const muscles = MUSCLE_ORDER.filter((m) => data[m] !== undefined);
  // Progress rows: most-fatigued (lowest %) first so what needs rest is up top.
  const muscleRows = [...muscles].sort(
    (a, b) => (data[a]?.recoveryPct ?? 100) - (data[b]?.recoveryPct ?? 100)
  );
  const [selected, setSelected] = useState<string>(muscles[0] ?? 'Chest');

  const selectMuscle = (muscle: string) => setSelected(muscle);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,280px)]">
        <div className="rounded-3xl border border-border/50 p-4 sm:p-6">
          <div
            className="flex justify-center gap-2 rounded-2xl px-2 pb-3 pt-4"
            style={{ background: 'linear-gradient(180deg, #f4f5f7 0%, #e9ebef 100%)' }}
          >
            <BodyFigure
              view="front"
              regions={BODY_FRONT}
              viewBox={FRONT_VIEWBOX}
              data={data}
              selected={selected}
              onSelect={selectMuscle}
            />
            <BodyFigure
              view="back"
              regions={BODY_BACK}
              viewBox={BACK_VIEWBOX}
              data={data}
              selected={selected}
              onSelect={selectMuscle}
            />
          </div>
          <p className="mt-3 text-center text-[10px] font-medium text-muted-foreground">
            Tap a highlighted area to inspect recovery
          </p>
        </div>

        <div className="hidden lg:block">
          <MuscleDetail muscle={selected} info={data[selected] ?? null} />
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
          Recovery progress
        </p>
        {muscleRows.map((muscle, index) => {
          const info = data[muscle];
          const status = info?.status ?? 'inactive';
          const pct = info?.recoveryPct ?? (status === 'inactive' ? 0 : 100);
          const isSelected = selected === muscle;
          const accent = MUSCLE_COLORS[muscle] ?? 'hsl(var(--primary))';
          const barColor = RECOVERY_COLORS[status];

          return (
            <button
              key={muscle}
              type="button"
              onClick={() => selectMuscle(muscle)}
              className={cn(
                'flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all active:scale-[0.99]',
                isSelected
                  ? 'border-primary/40 bg-primary/5 shadow-sm'
                  : 'border-border/60 bg-background hover:border-border'
              )}
            >
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: accent }} />
              <span className="w-[76px] shrink-0 truncate text-[11px] font-black uppercase tracking-wider">
                {muscle}
              </span>
              <span className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-muted/80">
                <motion.span
                  className="block h-full rounded-full"
                  style={{ backgroundColor: barColor }}
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ delay: 0.1 + index * 0.04, duration: 0.5, ease: 'easeOut' }}
                />
              </span>
              <span
                className="w-9 shrink-0 text-right text-xs font-black tabular-nums"
                style={{ color: barColor }}
              >
                {pct}%
              </span>
              <span className="hidden w-24 shrink-0 text-right text-[11px] font-bold text-muted-foreground sm:block">
                {info?.etaHours !== undefined ? formatRecoveryEta(info.etaHours) : 'Ready'}
              </span>
            </button>
          );
        })}
      </div>

      <div className="lg:hidden">
        <MuscleDetail muscle={selected} info={data[selected] ?? null} />
      </div>

      <div className="flex flex-wrap gap-3 border-t border-border/60 pt-4">
        {(Object.entries(RECOVERY_COLORS) as [RecoveryStatus, string][])
          .filter(([k]) => k !== 'inactive')
          .map(([status, color]) => (
            <div key={status} className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                {statusLabel(status)}
              </span>
            </div>
          ))}
      </div>
    </div>
  );
}
