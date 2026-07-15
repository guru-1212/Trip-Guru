'use client';

import { forwardRef, type CSSProperties } from 'react';
import type { RecapBar, RecapCardData, RecapMacro, RecapRing } from '@/workout/recapData';

const W = 1080;
const H = 1920;
const FONT = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
const MUTED = '#64748b';
const DIM = '#94a3b8';
const SURFACE = 'rgba(255,255,255,0.06)';
const SURFACE_BORDER = '1px solid rgba(255,255,255,0.1)';
const PRIMARY = '#818cf8';

type Props = { data: RecapCardData };

export const RecapCard = forwardRef<HTMLDivElement, Props>(function RecapCard({ data }, ref) {
  // Progress photo gets a full-bleed treatment; everything else uses the frame.
  if (data.type === 'photo') {
    return <PhotoCard ref={ref} data={data} />;
  }

  return (
    <div
      ref={ref}
      style={{
        width: W,
        height: H,
        position: 'relative',
        overflow: 'hidden',
        boxSizing: 'border-box',
        fontFamily: FONT,
        color: '#f8fafc',
        background: 'linear-gradient(165deg, #0f172a 0%, #1e293b 45%, #0f172a 100%)',
      }}
    >
      <div style={blob('#6366f1', -120, -80, 'right', 460)} />
      <div style={blob('#22c55e', undefined, -100, 'left', 380, 240)} />

      <div
        style={{
          position: 'relative',
          zIndex: 1,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          padding: '92px 76px 104px',
          boxSizing: 'border-box',
        }}
      >
        <Header data={data} />
        <AccentBar accent={data.accent} />
        <div style={{ marginTop: 60, flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <Body data={data} />
        </div>
        <Footer scope={data.scope} />
      </div>
    </div>
  );
});

// ── frame pieces ────────────────────────────────────────────────────
function Header({ data }: Props) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div>
        <p style={{ margin: 0, fontSize: 46, fontWeight: 900, letterSpacing: '-0.02em' }}>
          {data.athleteName}
        </p>
        <p style={{ margin: '10px 0 0', fontSize: 26, fontWeight: 700, letterSpacing: '0.05em', color: PRIMARY, textTransform: 'uppercase' }}>
          {cardTitle(data)}
        </p>
      </div>
      <div style={{ textAlign: 'right' }}>
        <span
          style={{
            display: 'inline-block',
            fontSize: 20,
            fontWeight: 800,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: '#0f172a',
            background: PRIMARY,
            borderRadius: 999,
            padding: '8px 20px',
          }}
        >
          {data.scope === 'day' ? 'Daily' : 'Weekly'}
        </span>
        <p style={{ margin: '14px 0 0', fontSize: 28, fontWeight: 600, color: MUTED }}>{data.dateLabel}</p>
      </div>
    </div>
  );
}

function AccentBar({ accent }: { accent: string[] }) {
  return (
    <div style={{ display: 'flex', gap: 8, marginTop: 40 }}>
      {accent.map((c, i) => (
        <div key={`${c}-${i}`} style={{ flex: 1, height: 8, borderRadius: 999, background: c }} />
      ))}
    </div>
  );
}

function Footer({ scope }: { scope: 'day' | 'week' }) {
  return (
    <div style={{ marginTop: 'auto', paddingTop: 36, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: 26, fontWeight: 900, letterSpacing: '-0.01em', color: PRIMARY }}>FitTrack</span>
      <span style={{ fontSize: 22, fontWeight: 700, color: MUTED }}>
        {scope === 'day' ? 'Daily recap' : 'Weekly recap'} · Developer Guru
      </span>
    </div>
  );
}

// ── body switch ─────────────────────────────────────────────────────
function Body({ data }: Props) {
  switch (data.type) {
    case 'cover':
      return <CoverBody data={data} />;
    case 'volume':
      return <VolumeBody data={data} />;
    case 'workout':
      return <WorkoutBody data={data} />;
    case 'weight':
      return <WeightBody data={data} />;
    case 'water':
      return <WaterBody data={data} />;
    case 'nutrition':
      return <NutritionBody data={data} />;
    case 'habits':
      return <HabitsBody data={data} />;
    default:
      return null;
  }
}

function CoverBody({ data }: { data: Extract<RecapCardData, { type: 'cover' }> }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Eyebrow>{data.scope === 'day' ? "Today's recap" : "This week's recap"}</Eyebrow>
      <h1 style={{ margin: '24px 0 0', fontSize: 96, fontWeight: 900, lineHeight: 1.02, letterSpacing: '-0.03em' }}>
        {data.headline}
      </h1>
      <div style={{ marginTop: 'auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 22 }}>
        {data.chips.map((c) => (
          <div key={c.label} style={{ background: SURFACE, border: SURFACE_BORDER, borderRadius: 28, padding: '34px 38px' }}>
            <p style={statLabel}>{c.label}</p>
            <p style={{ ...statValue, fontSize: 60 }}>{c.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function VolumeBody({ data }: { data: Extract<RecapCardData, { type: 'volume' }> }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Eyebrow>Training Volume</Eyebrow>
      <p style={{ margin: '20px 0 0', fontSize: 132, fontWeight: 900, lineHeight: 1, letterSpacing: '-0.04em', fontVariantNumeric: 'tabular-nums' }}>
        {data.volumeLabel}
      </p>
      <div style={{ display: 'flex', gap: 40, marginTop: 24 }}>
        <MiniStat label="Sets" value={String(data.sets)} />
        <MiniStat label={data.scope === 'day' ? 'Sessions' : 'Workouts'} value={String(data.sessions)} />
        {data.goalLabel && <MiniStat label="Goal" value={`${data.goalPct ?? 0}%`} />}
      </div>
      <div style={{ marginTop: 'auto' }}>
        <p style={{ ...statLabel, marginBottom: 24 }}>{data.barUnitLabel}</p>
        <BarChart bars={data.bars} height={420} />
      </div>
    </div>
  );
}

function WorkoutBody({ data }: { data: Extract<RecapCardData, { type: 'workout' }> }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Eyebrow>Workout</Eyebrow>
      <h1 style={{ margin: '18px 0 0', fontSize: 72, fontWeight: 900, lineHeight: 1.05, letterSpacing: '-0.03em' }}>
        {data.headline}
      </h1>
      <div style={{ marginTop: 44, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <StatCard label="Duration" value={data.durationLabel} />
        <StatCard label="Sets" value={String(data.sets)} />
        <StatCard label="Volume" value={data.volumeLabel} />
        <StatCard label="PRs" value={String(data.prCount)} accent={data.prCount > 0 ? '#fbbf24' : undefined} />
      </div>
      {data.empty ? (
        <div style={{ marginTop: 'auto', marginBottom: 40, textAlign: 'center', color: DIM }}>
          <p style={{ fontSize: 40, fontWeight: 800 }}>Rest day</p>
          <p style={{ fontSize: 28, marginTop: 8 }}>Recovery is where the gains happen.</p>
        </div>
      ) : (
        <div style={{ marginTop: 40, flex: 1 }}>
          <p style={{ ...statLabel, marginBottom: 18 }}>Top lifts</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {data.exercises.map((ex) => (
              <div
                key={`${ex.name}-${ex.detail}`}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderBottom: '1px solid rgba(255,255,255,0.08)' }}
              >
                <span style={{ fontSize: 30, fontWeight: 700, color: '#e2e8f0', maxWidth: '58%' }}>
                  {ex.pr ? '🏆 ' : ''}
                  {ex.name}
                </span>
                <span style={{ fontSize: 27, fontWeight: 600, color: ex.pr ? '#fbbf24' : DIM, fontVariantNumeric: 'tabular-nums' }}>
                  {ex.detail}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function WeightBody({ data }: { data: Extract<RecapCardData, { type: 'weight' }> }) {
  const deltaColor = data.deltaDir === 'up' ? '#fbbf24' : data.deltaDir === 'down' ? '#22c55e' : DIM;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Eyebrow>Body Weight</Eyebrow>
      <p style={{ margin: '20px 0 0', fontSize: 140, fontWeight: 900, lineHeight: 1, letterSpacing: '-0.04em', fontVariantNumeric: 'tabular-nums' }}>
        {data.current}
      </p>
      <div style={{ display: 'flex', gap: 40, marginTop: 24 }}>
        <MiniStat label="Change" value={data.deltaLabel} valueColor={deltaColor} />
        <MiniStat label="Target" value={data.target} />
      </div>
      <p style={{ margin: '28px 0 0', fontSize: 34, fontWeight: 800, color: PRIMARY }}>{data.toGoalLabel}</p>
      {!data.empty && data.points.length > 1 && (
        <div style={{ marginTop: 'auto' }}>
          <p style={{ ...statLabel, marginBottom: 24 }}>Recent trend</p>
          <BarChart bars={data.points.map((v, i) => ({ label: '', value: v, highlight: i === data.points.length - 1 }))} height={320} showValues={false} floor />
        </div>
      )}
    </div>
  );
}

function WaterBody({ data }: { data: Extract<RecapCardData, { type: 'water' }> }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Eyebrow>Hydration</Eyebrow>
      <p style={{ margin: '20px 0 0', fontSize: 200, fontWeight: 900, lineHeight: 1, letterSpacing: '-0.05em', color: '#38bdf8', fontVariantNumeric: 'tabular-nums' }}>
        {data.pct}%
      </p>
      <p style={{ margin: '8px 0 0', fontSize: 46, fontWeight: 800 }}>
        {data.totalLabel} <span style={{ color: MUTED, fontWeight: 700 }}>/ {data.goalLabel}</span>
      </p>
      <div style={{ marginTop: 'auto' }}>
        <Bar pct={data.pct} color="#38bdf8" height={40} />
        <p style={{ margin: '28px 0 0', fontSize: 38, fontWeight: 800, color: data.pct >= 100 ? '#22c55e' : DIM }}>{data.sub}</p>
      </div>
    </div>
  );
}

function NutritionBody({ data }: { data: Extract<RecapCardData, { type: 'nutrition' }> }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Eyebrow>Nutrition</Eyebrow>
      {data.empty ? (
        <div style={{ margin: 'auto', textAlign: 'center', color: DIM }}>
          <p style={{ fontSize: 44, fontWeight: 800 }}>No meals logged</p>
        </div>
      ) : (
        <>
          <p style={{ margin: '20px 0 0', fontSize: 132, fontWeight: 900, lineHeight: 1, letterSpacing: '-0.04em', fontVariantNumeric: 'tabular-nums' }}>
            {data.calories.toLocaleString()}
          </p>
          <p style={{ margin: '8px 0 0', fontSize: 34, fontWeight: 700, color: MUTED }}>
            kcal {data.calorieTarget > 0 ? `/ ${data.calorieTarget.toLocaleString()} target` : ''} · {data.sub}
          </p>
          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 40 }}>
            {data.macros.map((m) => (
              <MacroRow key={m.label} macro={m} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function HabitsBody({ data }: { data: Extract<RecapCardData, { type: 'habits' }> }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Eyebrow>Consistency</Eyebrow>
      <p style={{ margin: '18px 0 40px', fontSize: 40, fontWeight: 800, color: '#e2e8f0' }}>{data.sub}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 34, marginTop: 'auto', marginBottom: 'auto' }}>
        {data.rings.map((r) => (
          <HabitRow key={r.label} ring={r} />
        ))}
      </div>
    </div>
  );
}

// ── photo card (full-bleed) ─────────────────────────────────────────
const PhotoCard = forwardRef<HTMLDivElement, { data: Extract<RecapCardData, { type: 'photo' }> }>(
  function PhotoCard({ data }, ref) {
    return (
      <div
        ref={ref}
        style={{
          width: W,
          height: H,
          position: 'relative',
          overflow: 'hidden',
          boxSizing: 'border-box',
          fontFamily: FONT,
          color: '#f8fafc',
          background: 'linear-gradient(165deg, #0f172a 0%, #1e293b 45%, #0f172a 100%)',
        }}
      >
        {data.dataUrl ? (
          <img
            src={data.dataUrl}
            alt=""
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'contrast(1.05) saturate(1.08)' }}
          />
        ) : (
          <div style={blob('#6366f1', -120, -80, 'right', 460)} />
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(15,23,42,0.55) 0%, rgba(15,23,42,0) 26%, rgba(15,23,42,0) 55%, rgba(15,23,42,0.92) 100%)' }} />
        <div style={{ position: 'absolute', inset: 0, padding: '92px 76px 104px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <p style={{ margin: 0, fontSize: 46, fontWeight: 900, letterSpacing: '-0.02em' }}>{data.athleteName}</p>
            <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#0f172a', background: PRIMARY, borderRadius: 999, padding: '8px 20px' }}>
              {data.scope === 'day' ? 'Daily' : 'Weekly'}
            </span>
          </div>
          <div style={{ marginTop: 'auto' }}>
            <p style={{ margin: 0, fontSize: 30, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: PRIMARY }}>
              Progress
            </p>
            <h1 style={{ margin: '14px 0 0', fontSize: 78, fontWeight: 900, letterSpacing: '-0.03em' }}>
              {data.dataUrl ? data.caption : 'No progress photo'}
            </h1>
            {data.count > 1 && <p style={{ margin: '10px 0 0', fontSize: 30, fontWeight: 700, color: DIM }}>{data.count} photos this {data.scope === 'day' ? 'day' : 'week'}</p>}
            <div style={{ marginTop: 40, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 26, fontWeight: 900, color: PRIMARY }}>FitTrack</span>
              <span style={{ fontSize: 22, fontWeight: 700, color: DIM }}>Developer Guru</span>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

// ── shared primitives ───────────────────────────────────────────────
function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ margin: 0, fontSize: 28, fontWeight: 800, letterSpacing: '0.22em', textTransform: 'uppercase', color: MUTED }}>
      {children}
    </p>
  );
}

function MiniStat({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div>
      <p style={{ ...statLabel, fontSize: 22 }}>{label}</p>
      <p style={{ margin: '6px 0 0', fontSize: 52, fontWeight: 900, color: valueColor ?? '#f8fafc', fontVariantNumeric: 'tabular-nums' }}>{value}</p>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div style={{ background: SURFACE, border: SURFACE_BORDER, borderRadius: 24, padding: '26px 30px' }}>
      <p style={statLabel}>{label}</p>
      <p style={{ ...statValue, color: accent ?? '#f8fafc' }}>{value}</p>
    </div>
  );
}

function Bar({ pct, color, height = 28 }: { pct: number; color: string; height?: number }) {
  return (
    <div style={{ width: '100%', height, borderRadius: 999, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
      <div style={{ width: `${Math.max(0, Math.min(100, pct))}%`, height: '100%', borderRadius: 999, background: color }} />
    </div>
  );
}

function MacroRow({ macro }: { macro: RecapMacro }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
        <span style={{ fontSize: 34, fontWeight: 800 }}>{macro.label}</span>
        <span style={{ fontSize: 30, fontWeight: 700, color: DIM, fontVariantNumeric: 'tabular-nums' }}>
          {macro.value}{macro.unit} {macro.target > 0 ? <span style={{ color: MUTED }}>/ {macro.target}{macro.unit}</span> : null}
        </span>
      </div>
      <Bar pct={macro.pct} color={macro.color} height={30} />
    </div>
  );
}

function HabitRow({ ring }: { ring: RecapRing }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
        <span style={{ fontSize: 36, fontWeight: 800 }}>{ring.label}</span>
        <span style={{ fontSize: 28, fontWeight: 700, color: DIM }}>{ring.sub}</span>
      </div>
      <Bar pct={ring.pct} color={ring.color} height={32} />
    </div>
  );
}

function BarChart({
  bars,
  height,
  showValues = false,
  floor = false,
}: {
  bars: RecapBar[];
  height: number;
  showValues?: boolean;
  floor?: boolean;
}) {
  const values = bars.map((b) => b.value);
  const max = Math.max(1, ...values);
  const min = floor ? Math.min(...values) : 0;
  const span = Math.max(1, max - min);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, height }}>
      {bars.map((b, i) => {
        const ratio = floor ? (b.value - min) / span : b.value / max;
        const barH = Math.max(6, Math.round(ratio * (height - 60)));
        return (
          <div key={`${b.label}-${i}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
            {showValues && b.value > 0 && (
              <span style={{ fontSize: 18, fontWeight: 700, color: DIM, marginBottom: 8 }}>{Math.round(b.value / 1000)}k</span>
            )}
            <div
              style={{
                width: '100%',
                maxWidth: 96,
                height: barH,
                borderRadius: 14,
                background: b.highlight ? PRIMARY : 'rgba(255,255,255,0.14)',
              }}
            />
            {b.label && <span style={{ fontSize: 22, fontWeight: 700, color: MUTED, marginTop: 14 }}>{b.label}</span>}
          </div>
        );
      })}
    </div>
  );
}

// ── style tokens & tiny utils ───────────────────────────────────────
const statLabel: CSSProperties = {
  margin: 0,
  fontSize: 24,
  fontWeight: 800,
  letterSpacing: '0.15em',
  textTransform: 'uppercase',
  color: MUTED,
};
const statValue: CSSProperties = {
  margin: '12px 0 0',
  fontSize: 52,
  fontWeight: 900,
  fontVariantNumeric: 'tabular-nums',
};

function blob(
  color: string,
  top: number | undefined,
  offset: number,
  side: 'left' | 'right',
  size: number,
  bottom?: number
): CSSProperties {
  return {
    position: 'absolute',
    ...(top !== undefined ? { top } : {}),
    ...(bottom !== undefined ? { bottom } : {}),
    [side]: offset,
    width: size,
    height: size,
    borderRadius: '50%',
    background: `radial-gradient(circle, ${color}55 0%, transparent 70%)`,
  } as CSSProperties;
}

function cardTitle(data: RecapCardData): string {
  switch (data.type) {
    case 'cover':
      return data.scope === 'day' ? 'Daily Recap' : 'Weekly Recap';
    case 'volume':
      return 'Volume';
    case 'workout':
      return 'Workout';
    case 'weight':
      return 'Weight';
    case 'water':
      return 'Hydration';
    case 'nutrition':
      return 'Nutrition';
    case 'habits':
      return 'Consistency';
    case 'photo':
      return 'Progress';
    default:
      return '';
  }
}
