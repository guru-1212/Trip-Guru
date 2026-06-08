'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { MUSCLE_COLORS } from '@/workout/constants';

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
  lastTrained?: string;
}

interface Zone {
  muscle: string;
  view: 'front' | 'back';
  d: string;
}

/** Stylized front/back zones — tap a region or chip to see recovery details */
const ZONES: Zone[] = [
  { muscle: 'Shoulders', view: 'front', d: 'M 48 52 Q 60 44 72 52 L 76 68 Q 60 62 44 68 Z' },
  { muscle: 'Chest', view: 'front', d: 'M 44 68 Q 60 64 76 68 L 74 98 Q 60 104 46 98 Z' },
  { muscle: 'Biceps', view: 'front', d: 'M 18 72 Q 10 95 14 118 L 28 116 Q 32 92 26 70 Z M 102 70 Q 110 92 106 116 L 92 118 Q 88 94 94 72 Z' },
  { muscle: 'Forearms', view: 'front', d: 'M 12 118 Q 8 145 12 168 L 24 166 Q 28 142 24 118 Z M 108 118 Q 112 142 108 166 L 96 168 Q 92 144 96 118 Z' },
  { muscle: 'Abs', view: 'front', d: 'M 46 98 Q 60 102 74 98 L 72 138 Q 60 144 48 138 Z' },
  { muscle: 'Quads', view: 'front', d: 'M 42 138 L 38 210 Q 48 214 54 210 L 56 138 Z M 78 138 L 82 210 Q 72 214 66 210 L 64 138 Z' },
  { muscle: 'Calves', view: 'front', d: 'M 40 210 Q 38 248 42 268 L 50 268 Q 54 246 52 210 Z M 80 210 Q 82 248 78 268 L 70 268 Q 66 246 68 210 Z' },
  { muscle: 'Back', view: 'back', d: 'M 164 68 Q 180 64 196 68 L 194 108 Q 180 114 166 108 Z' },
  { muscle: 'Triceps', view: 'back', d: 'M 138 72 Q 130 95 134 118 L 148 116 Q 152 92 146 70 Z M 222 70 Q 230 92 226 116 L 212 118 Q 208 94 214 72 Z' },
  { muscle: 'Glutes', view: 'back', d: 'M 166 108 Q 180 104 194 108 L 192 138 Q 180 144 168 138 Z' },
  { muscle: 'Hamstrings', view: 'back', d: 'M 162 138 L 158 210 Q 168 214 174 210 L 176 138 Z M 198 138 L 202 210 Q 192 214 186 210 L 184 138 Z' },
  { muscle: 'Calves', view: 'back', d: 'M 160 210 Q 158 248 162 268 L 170 268 Q 174 246 172 210 Z M 200 210 Q 202 248 198 268 L 190 268 Q 186 246 188 210 Z' },
];

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

function MuscleDetail({ muscle, info }: { muscle: string; info: MuscleData | null }) {
  const accent = MUSCLE_COLORS[muscle] ?? 'hsl(var(--primary))';
  const status = info?.status ?? 'inactive';

  return (
    <div className="rounded-2xl border border-border/60 bg-muted/20 p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span className="mt-1 h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: accent }} />
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Selected</p>
          <p className="text-lg font-black tracking-tight">{muscle}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider"
              style={{
                backgroundColor: `${RECOVERY_COLORS[status]}18`,
                color: RECOVERY_COLORS[status],
              }}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: RECOVERY_COLORS[status] }} />
              {statusLabel(status)}
            </span>
            {info?.lastTrained && (
              <span className="text-xs font-medium text-muted-foreground">Last trained {info.lastTrained}</span>
            )}
          </div>
          {!info && (
            <p className="mt-2 text-xs text-muted-foreground">No recent sessions logged for this group.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export function MuscleRecoveryMap({ data }: { data: Record<string, MuscleData> }) {
  const muscles = MUSCLE_ORDER.filter((m) => data[m] !== undefined);
  const [selected, setSelected] = useState<string>(muscles[0] ?? 'Chest');

  const selectMuscle = (muscle: string) => setSelected(muscle);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,280px)]">
        <div className="rounded-3xl border border-border/50 bg-slate-900/[0.03] p-4 sm:p-6">
          <div className="mb-3 flex items-center justify-center gap-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            <span>Front</span>
            <span>Back</span>
          </div>
          <svg
            viewBox="0 0 240 290"
            className="mx-auto h-auto w-full max-w-[320px]"
            role="img"
            aria-label="Muscle recovery body map"
          >
            <ellipse cx="60" cy="28" rx="16" ry="18" className="fill-muted/40 stroke-border" strokeWidth="1" />
            <ellipse cx="180" cy="28" rx="16" ry="18" className="fill-muted/40 stroke-border" strokeWidth="1" />
            <path
              d="M 44 46 Q 60 40 76 46 L 78 138 Q 60 146 42 138 Z"
              className="fill-muted/20 stroke-border"
              strokeWidth="1"
            />
            <path
              d="M 164 46 Q 180 40 196 46 L 198 138 Q 180 146 162 138 Z"
              className="fill-muted/20 stroke-border"
              strokeWidth="1"
            />

            {ZONES.map((zone, i) => {
              const info = data[zone.muscle];
              const status = info?.status ?? 'inactive';
              const isSelected = selected === zone.muscle;
              const fill = RECOVERY_COLORS[status];

              return (
                <path
                  key={`${zone.muscle}-${zone.view}-${i}`}
                  d={zone.d}
                  fill={fill}
                  fillOpacity={isSelected ? 0.85 : 0.55}
                  stroke={isSelected ? fill : 'transparent'}
                  strokeWidth={isSelected ? 2.5 : 0}
                  className="cursor-pointer transition-all duration-200 hover:fill-opacity-80"
                  onClick={() => selectMuscle(zone.muscle)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      selectMuscle(zone.muscle);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label={`${zone.muscle}, ${statusLabel(status)}`}
                  aria-pressed={isSelected}
                />
              );
            })}
          </svg>
          <p className="mt-3 text-center text-[10px] font-medium text-muted-foreground">
            Tap a highlighted area to inspect recovery
          </p>
        </div>

        <div className="hidden lg:block">
          <MuscleDetail muscle={selected} info={data[selected] ?? null} />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {muscles.map((muscle) => {
          const info = data[muscle];
          const status = info?.status ?? 'inactive';
          const isSelected = selected === muscle;
          const accent = MUSCLE_COLORS[muscle] ?? 'hsl(var(--primary))';

          return (
            <button
              key={muscle}
              type="button"
              onClick={() => selectMuscle(muscle)}
              className={cn(
                'inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-left transition-all active:scale-[0.98]',
                isSelected
                  ? 'border-primary/40 bg-primary/5 shadow-sm'
                  : 'border-border/60 bg-background hover:border-border'
              )}
            >
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: accent }} />
              <span className="text-[11px] font-black uppercase tracking-wider">{muscle}</span>
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: RECOVERY_COLORS[status] }}
                title={statusLabel(status)}
              />
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
