'use client';

import { forwardRef, type CSSProperties } from 'react';
import type {
  RadarAxis,
  RecapCardData,
  RecapMacro,
  RecapRing,
  RecapTheme,
} from '@/workout/recapData';

const W = 1080;
const H = 1920;
const FONT = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
const ACCENT = '#6366f1';
const ACCENT_FILL = 'rgba(99,102,241,0.22)';
const CYAN = '#06b6d4';

interface Tokens {
  canvas: string;
  card: string;
  cardBorder: string;
  cardShadow: string;
  text: string;
  muted: string;
  faint: string;
  track: string;
  surface: string;
  surfaceBorder: string;
}

function tokensFor(theme: RecapTheme): Tokens {
  if (theme === 'light') {
    return {
      canvas: 'linear-gradient(160deg, #f1f5f9 0%, #e2e8f0 100%)',
      card: '#ffffff',
      cardBorder: '1px solid #eef2f7',
      cardShadow: '0 30px 80px rgba(15,23,42,0.14)',
      text: '#0f172a',
      muted: '#64748b',
      faint: '#dbe2ea',
      track: '#eef2f7',
      surface: '#f8fafc',
      surfaceBorder: '1px solid #eef2f7',
    };
  }
  if (theme === 'dark') {
    return {
      canvas: 'linear-gradient(160deg, #0b1220 0%, #0f172a 100%)',
      card: '#111827',
      cardBorder: '1px solid rgba(255,255,255,0.08)',
      cardShadow: '0 30px 80px rgba(0,0,0,0.5)',
      text: '#f8fafc',
      muted: '#94a3b8',
      faint: '#334155',
      track: 'rgba(255,255,255,0.10)',
      surface: 'rgba(255,255,255,0.05)',
      surfaceBorder: '1px solid rgba(255,255,255,0.08)',
    };
  }
  return {
    canvas: 'transparent',
    card: 'rgba(17,24,39,0.72)',
    cardBorder: '1px solid rgba(255,255,255,0.16)',
    cardShadow: '0 30px 80px rgba(0,0,0,0.45)',
    text: '#f8fafc',
    muted: '#cbd5e1',
    faint: '#475569',
    track: 'rgba(255,255,255,0.14)',
    surface: 'rgba(255,255,255,0.06)',
    surfaceBorder: '1px solid rgba(255,255,255,0.12)',
  };
}

type Props = { data: RecapCardData; theme: RecapTheme };

export const RecapCard = forwardRef<HTMLDivElement, Props>(function RecapCard({ data, theme }, ref) {
  if (data.type === 'photo') return <PhotoCard ref={ref} data={data} />;
  const tok = tokensFor(theme);

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
        background: tok.canvas,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '72px 60px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 960,
          background: tok.card,
          border: tok.cardBorder,
          boxShadow: tok.cardShadow,
          borderRadius: 56,
          padding: '64px 60px',
          boxSizing: 'border-box',
          color: tok.text,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 44 }}>
          <span style={{ fontSize: 30, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: ACCENT }}>
            {cardTitle(data)}
          </span>
          <span style={{ fontSize: 26, fontWeight: 600, color: tok.muted }}>{data.dateLabel}</span>
        </div>

        <Body data={data} tok={tok} />

        <div
          style={{
            marginTop: 48,
            paddingTop: 32,
            borderTop: tok.surfaceBorder,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ fontSize: 30, fontWeight: 900, color: ACCENT, letterSpacing: '-0.01em' }}>FitTrack</span>
          <span style={{ fontSize: 28, fontWeight: 700, color: tok.muted }}>{data.handle}</span>
        </div>
      </div>
    </div>
  );
});

function Body({ data, tok }: { data: RecapCardData; tok: Tokens }) {
  switch (data.type) {
    case 'overview':
      return <OverviewBody data={data} tok={tok} />;
    case 'comparison':
      return <ComparisonBody data={data} tok={tok} />;
    case 'workout':
      return <WorkoutBody data={data} tok={tok} />;
    case 'weight':
      return <WeightBody data={data} tok={tok} />;
    case 'water':
      return <WaterBody data={data} tok={tok} />;
    case 'nutrition':
      return <NutritionBody data={data} tok={tok} />;
    case 'habits':
      return <HabitsBody data={data} tok={tok} />;
    default:
      return null;
  }
}

function OverviewBody({ data, tok }: { data: Extract<RecapCardData, { type: 'overview' }>; tok: Tokens }) {
  const stats = [
    { l: 'Duration', v: data.durationLabel },
    { l: 'Volume', v: data.volumeLabel },
    { l: 'Sets', v: String(data.sets) },
  ];
  return (
    <div>
      <div style={{ display: 'flex', gap: 20, marginBottom: 40 }}>
        {stats.map((s) => (
          <div key={s.l} style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: 46, fontWeight: 900, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{s.v}</p>
            <p style={{ ...labelStyle(tok), marginTop: 8 }}>{s.l}</p>
          </div>
        ))}
      </div>
      <Radar axes={data.radar} tok={tok} />
      {!data.hasData && (
        <p style={{ textAlign: 'center', color: tok.muted, fontSize: 30, fontWeight: 600, marginTop: 8 }}>
          Rest day — no training logged
        </p>
      )}
    </div>
  );
}

function ComparisonBody({ data }: { data: Extract<RecapCardData, { type: 'comparison' }>; tok: Tokens }) {
  return (
    <div style={{ textAlign: 'center', padding: '16px 0' }}>
      <p style={{ margin: 0, fontSize: 36, fontWeight: 600, opacity: 0.75 }}>You lifted a total of</p>
      <p style={{ margin: '14px 0', fontSize: 108, fontWeight: 900, color: ACCENT, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>
        {data.volumeLabel}
      </p>
      <p style={{ margin: 0, fontSize: 42, fontWeight: 800 }}>That&apos;s like lifting {data.objectLabel}!</p>
      <p style={{ margin: '28px 0 0', fontSize: 220, lineHeight: 1 }}>{data.emoji}</p>
    </div>
  );
}

function WorkoutBody({ data, tok }: { data: Extract<RecapCardData, { type: 'workout' }>; tok: Tokens }) {
  const stats = [
    { l: 'Duration', v: data.durationLabel },
    { l: 'Volume', v: data.volumeLabel },
    { l: 'Exercises', v: String(data.exercisesCount) },
    { l: 'Sets', v: String(data.sets) },
  ];
  return (
    <div>
      <h1 style={{ margin: '0 0 36px', fontSize: 60, fontWeight: 900, lineHeight: 1.05, letterSpacing: '-0.02em' }}>
        {data.headline}
      </h1>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
        {stats.map((s) => (
          <div key={s.l} style={{ background: tok.surface, border: tok.surfaceBorder, borderRadius: 28, padding: '26px 30px' }}>
            <p style={labelStyle(tok)}>{s.l}</p>
            <p style={{ margin: '10px 0 0', fontSize: 46, fontWeight: 900, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{s.v}</p>
          </div>
        ))}
      </div>
      {data.empty ? (
        <p style={{ textAlign: 'center', color: tok.muted, fontSize: 32, fontWeight: 700, marginTop: 44 }}>
          Recovery is where the gains happen 💪
        </p>
      ) : data.exercises.length > 0 ? (
        <div style={{ marginTop: 40 }}>
          <p style={{ ...labelStyle(tok), marginBottom: 8 }}>Top lifts</p>
          {data.exercises.map((ex) => (
            <div
              key={`${ex.name}-${ex.detail}`}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 0', borderBottom: tok.surfaceBorder }}
            >
              <span style={{ fontSize: 30, fontWeight: 700, maxWidth: '56%' }}>
                {ex.pr ? '🏆 ' : ''}
                {ex.name}
              </span>
              <span style={{ fontSize: 26, fontWeight: 600, color: ex.pr ? '#d97706' : tok.muted, fontVariantNumeric: 'tabular-nums' }}>
                {ex.detail}
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function WeightBody({ data, tok }: { data: Extract<RecapCardData, { type: 'weight' }>; tok: Tokens }) {
  const deltaColor = data.deltaDir === 'up' ? '#d97706' : data.deltaDir === 'down' ? '#16a34a' : tok.muted;
  return (
    <div>
      <p style={{ margin: 0, fontSize: 128, fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
        {data.current}
      </p>
      <div style={{ display: 'flex', gap: 56, margin: '28px 0 24px' }}>
        <Stat label="Change" value={data.deltaLabel} color={deltaColor} tok={tok} />
        <Stat label="Target" value={data.target} tok={tok} />
      </div>
      <p style={{ margin: 0, fontSize: 34, fontWeight: 800, color: ACCENT }}>{data.toGoalLabel}</p>
      {!data.empty && data.points.length > 1 && (
        <div style={{ marginTop: 44 }}>
          <p style={{ ...labelStyle(tok), marginBottom: 20 }}>Recent trend</p>
          <SparkBars points={data.points} tok={tok} />
        </div>
      )}
    </div>
  );
}

function WaterBody({ data, tok }: { data: Extract<RecapCardData, { type: 'water' }>; tok: Tokens }) {
  return (
    <div>
      <p style={{ margin: 0, fontSize: 150, fontWeight: 900, color: CYAN, letterSpacing: '-0.04em', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
        {data.pct}%
      </p>
      <p style={{ margin: '10px 0 36px', fontSize: 42, fontWeight: 800 }}>
        {data.totalLabel} <span style={{ color: tok.muted, fontWeight: 700 }}>/ {data.goalLabel}</span>
      </p>
      <Bar pct={data.pct} color={CYAN} tok={tok} height={36} />
      <p style={{ margin: '28px 0 0', fontSize: 34, fontWeight: 800, color: data.pct >= 100 ? '#16a34a' : tok.muted }}>{data.sub}</p>
    </div>
  );
}

function NutritionBody({ data, tok }: { data: Extract<RecapCardData, { type: 'nutrition' }>; tok: Tokens }) {
  if (data.empty) {
    return <p style={{ textAlign: 'center', color: tok.muted, fontSize: 40, fontWeight: 700, padding: '40px 0' }}>No meals logged</p>;
  }
  return (
    <div>
      <p style={{ margin: 0, fontSize: 108, fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
        {data.calories.toLocaleString()}
      </p>
      <p style={{ margin: '8px 0 40px', fontSize: 30, fontWeight: 700, color: tok.muted }}>
        kcal {data.calorieTarget > 0 ? `/ ${data.calorieTarget.toLocaleString()} target` : ''} · {data.sub}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
        {data.macros.map((m) => (
          <MacroRow key={m.label} macro={m} tok={tok} />
        ))}
      </div>
    </div>
  );
}

function HabitsBody({ data, tok }: { data: Extract<RecapCardData, { type: 'habits' }>; tok: Tokens }) {
  return (
    <div>
      <p style={{ margin: '0 0 36px', fontSize: 34, fontWeight: 800, color: tok.muted }}>{data.sub}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
        {data.rings.map((r) => (
          <HabitRow key={r.label} ring={r} tok={tok} />
        ))}
      </div>
    </div>
  );
}

// ── radar chart (inline SVG) ────────────────────────────────────────
function Radar({ axes, tok }: { axes: RadarAxis[]; tok: Tokens }) {
  const size = 560;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 78;
  const n = axes.length;
  const pt = (i: number, radius: number): [number, number] => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    return [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)];
  };
  const ring = (f: number) => axes.map((_, i) => pt(i, r * f).join(',')).join(' ');
  const dataPoly = axes.map((a, i) => pt(i, r * Math.max(0.03, a.value)).join(',')).join(' ');

  // SVG for the shapes; HTML spans for the labels (rasterize reliably in html2canvas).
  return (
    <div style={{ position: 'relative', width: size, height: size, margin: '0 auto' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ position: 'absolute', inset: 0 }}>
        {[0.34, 0.67, 1].map((f) => (
          <polygon key={f} points={ring(f)} fill="none" stroke={tok.faint} strokeWidth={2} />
        ))}
        {axes.map((_, i) => {
          const [x, y] = pt(i, r);
          return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke={tok.faint} strokeWidth={2} />;
        })}
        <polygon points={dataPoly} fill={ACCENT_FILL} stroke={ACCENT} strokeWidth={4} strokeLinejoin="round" />
      </svg>
      {axes.map((a, i) => {
        const [x, y] = pt(i, r + 46);
        return (
          <span
            key={a.label}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              transform: 'translate(-50%, -50%)',
              fontSize: 24,
              fontWeight: 700,
              color: tok.muted,
              whiteSpace: 'nowrap',
            }}
          >
            {a.label}
          </span>
        );
      })}
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
          background: 'linear-gradient(160deg, #0b1220 0%, #0f172a 100%)',
        }}
      >
        {data.dataUrl && (
          <img
            src={data.dataUrl}
            alt=""
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'contrast(1.05) saturate(1.08)' }}
          />
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(11,18,32,0.55) 0%, rgba(11,18,32,0) 28%, rgba(11,18,32,0) 52%, rgba(11,18,32,0.94) 100%)' }} />
        <div style={{ position: 'absolute', inset: 0, padding: '96px 76px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: 30, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#c7d2fe' }}>Progress</span>
            <span style={{ fontSize: 26, fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>{data.dateLabel}</span>
          </div>
          <div style={{ marginTop: 'auto' }}>
            <h1 style={{ margin: 0, fontSize: 76, fontWeight: 900, letterSpacing: '-0.03em' }}>
              {data.dataUrl ? data.caption : 'No progress photo'}
            </h1>
            {data.count > 1 && <p style={{ margin: '12px 0 0', fontSize: 30, fontWeight: 700, color: 'rgba(255,255,255,0.75)' }}>{data.count} photos this {data.scope === 'day' ? 'day' : 'week'}</p>}
            <div style={{ marginTop: 40, paddingTop: 30, borderTop: '1px solid rgba(255,255,255,0.14)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 30, fontWeight: 900, color: '#c7d2fe' }}>FitTrack</span>
              <span style={{ fontSize: 28, fontWeight: 700, color: 'rgba(255,255,255,0.8)' }}>{data.handle}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

// ── shared primitives ───────────────────────────────────────────────
function labelStyle(tok: Tokens): CSSProperties {
  return { margin: 0, fontSize: 24, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: tok.muted };
}

function Stat({ label, value, color, tok }: { label: string; value: string; color?: string; tok: Tokens }) {
  return (
    <div>
      <p style={{ margin: 0, fontSize: 52, fontWeight: 900, color: color ?? tok.text, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{value}</p>
      <p style={{ ...labelStyle(tok), marginTop: 8 }}>{label}</p>
    </div>
  );
}

function Bar({ pct, color, tok, height = 30 }: { pct: number; color: string; tok: Tokens; height?: number }) {
  return (
    <div style={{ width: '100%', height, borderRadius: 999, background: tok.track, overflow: 'hidden' }}>
      <div style={{ width: `${Math.max(0, Math.min(100, pct))}%`, height: '100%', borderRadius: 999, background: color }} />
    </div>
  );
}

function MacroRow({ macro, tok }: { macro: RecapMacro; tok: Tokens }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
        <span style={{ fontSize: 34, fontWeight: 800 }}>{macro.label}</span>
        <span style={{ fontSize: 30, fontWeight: 700, color: tok.muted, fontVariantNumeric: 'tabular-nums' }}>
          {macro.value}{macro.unit}
          {macro.target > 0 ? <span style={{ opacity: 0.7 }}> / {macro.target}{macro.unit}</span> : null}
        </span>
      </div>
      <Bar pct={macro.pct} color={macro.color} tok={tok} height={28} />
    </div>
  );
}

function HabitRow({ ring, tok }: { ring: RecapRing; tok: Tokens }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
        <span style={{ fontSize: 36, fontWeight: 800 }}>{ring.label}</span>
        <span style={{ fontSize: 28, fontWeight: 700, color: tok.muted }}>{ring.sub}</span>
      </div>
      <Bar pct={ring.pct} color={ring.color} tok={tok} height={30} />
    </div>
  );
}

function SparkBars({ points, tok }: { points: number[]; tok: Tokens }) {
  const max = Math.max(...points);
  const min = Math.min(...points);
  const span = Math.max(1, max - min);
  const height = 240;
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, height }}>
      {points.map((v, i) => {
        const ratio = (v - min) / span;
        const barH = Math.max(10, Math.round(ratio * (height - 20)));
        return (
          <div
            key={i}
            style={{ flex: 1, height: barH, borderRadius: 12, background: i === points.length - 1 ? ACCENT : tok.track }}
          />
        );
      })}
    </div>
  );
}

function cardTitle(data: RecapCardData): string {
  switch (data.type) {
    case 'overview':
      return data.scope === 'day' ? 'Daily Recap' : 'Weekly Recap';
    case 'comparison':
      return 'Total Volume';
    case 'workout':
      return 'Workout';
    case 'weight':
      return 'Body Weight';
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
