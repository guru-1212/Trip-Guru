'use client';

import { forwardRef } from 'react';
import type { WorkoutShareCardData } from '@/workout/shareCard';

const CARD_WIDTH = 1080;
const CARD_HEIGHT = 1920;

type WorkoutShareCardProps = {
  data: WorkoutShareCardData;
};

export const WorkoutShareCard = forwardRef<HTMLDivElement, WorkoutShareCardProps>(
  function WorkoutShareCard({ data }, ref) {
    const hasPrs = data.prCount > 0;

    return (
      <div
        ref={ref}
        style={{
          width: CARD_WIDTH,
          height: CARD_HEIGHT,
          position: 'fixed',
          left: -9999,
          top: 0,
          zIndex: -1,
          pointerEvents: 'none',
          fontFamily:
            'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          color: '#f8fafc',
          background: 'linear-gradient(165deg, #0f172a 0%, #1e293b 45%, #0f172a 100%)',
          overflow: 'hidden',
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: -120,
            right: -80,
            width: 420,
            height: 420,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(29,158,117,0.35) 0%, transparent 70%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 200,
            left: -100,
            width: 360,
            height: 360,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(55,138,221,0.25) 0%, transparent 70%)',
          }}
        />

        <div
          style={{
            position: 'relative',
            zIndex: 1,
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            padding: '96px 72px 120px',
            boxSizing: 'border-box',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p
                style={{
                  margin: 0,
                  fontSize: 28,
                  fontWeight: 800,
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  color: '#1D9E75',
                }}
              >
                FitTrack
              </p>
              <p style={{ margin: '12px 0 0', fontSize: 36, fontWeight: 700, color: '#94a3b8' }}>
                {data.athleteName}
              </p>
            </div>
            <p style={{ margin: 0, fontSize: 30, fontWeight: 600, color: '#64748b' }}>
              {data.dateLabel}
            </p>
          </div>

          {/* Muscle accent bar */}
          <div style={{ display: 'flex', gap: 8, marginTop: 48 }}>
            {data.muscleColors.map((color) => (
              <div
                key={color}
                style={{
                  flex: 1,
                  height: 8,
                  borderRadius: 999,
                  background: color,
                }}
              />
            ))}
          </div>

          {/* Hero */}
          <div style={{ marginTop: 56, flex: '0 0 auto' }}>
            <p
              style={{
                margin: 0,
                fontSize: 26,
                fontWeight: 800,
                letterSpacing: '0.25em',
                textTransform: 'uppercase',
                color: '#64748b',
              }}
            >
              Today&apos;s Workout
            </p>
            <h1
              style={{
                margin: '20px 0 0',
                fontSize: 88,
                fontWeight: 900,
                lineHeight: 1.05,
                letterSpacing: '-0.03em',
                color: '#ffffff',
              }}
            >
              {data.splitName}
            </h1>
          </div>

          {/* Stats */}
          <div
            style={{
              marginTop: 56,
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 20,
            }}
          >
            {[
              { label: 'Duration', value: data.durationLabel },
              { label: 'Sets', value: String(data.totalSets) },
              { label: 'Volume', value: data.volumeLabel },
              { label: 'PRs', value: String(data.prCount) },
            ].map((stat) => (
              <div
                key={stat.label}
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 24,
                  padding: '28px 32px',
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontSize: 22,
                    fontWeight: 800,
                    letterSpacing: '0.15em',
                    textTransform: 'uppercase',
                    color: '#64748b',
                  }}
                >
                  {stat.label}
                </p>
                <p
                  style={{
                    margin: '12px 0 0',
                    fontSize: 48,
                    fontWeight: 900,
                    color: '#f8fafc',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {stat.value}
                </p>
              </div>
            ))}
          </div>

          {/* Highlights */}
          {data.highlights.length > 0 && (
            <div style={{ marginTop: 48 }}>
              <p
                style={{
                  margin: '0 0 20px',
                  fontSize: 24,
                  fontWeight: 800,
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  color: hasPrs ? '#fbbf24' : '#1D9E75',
                }}
              >
                {hasPrs ? 'New Personal Records' : 'Top Lifts'}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {data.highlights.map((item) => (
                  <div
                    key={`${item.type}-${item.name}`}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: hasPrs ? 'rgba(251,191,36,0.12)' : 'rgba(29,158,117,0.12)',
                      border: `1px solid ${hasPrs ? 'rgba(251,191,36,0.35)' : 'rgba(29,158,117,0.35)'}`,
                      borderRadius: 20,
                      padding: '24px 28px',
                    }}
                  >
                    <span style={{ fontSize: 34, fontWeight: 800, color: '#f8fafc' }}>
                      {item.name}
                    </span>
                    <span
                      style={{
                        fontSize: 32,
                        fontWeight: 700,
                        color: hasPrs ? '#fbbf24' : '#1D9E75',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {item.detail}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Exercise list */}
          {data.exercises.length > 0 && (
            <div style={{ marginTop: 40, flex: 1 }}>
              <p
                style={{
                  margin: '0 0 20px',
                  fontSize: 24,
                  fontWeight: 800,
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  color: '#64748b',
                }}
              >
                Session Highlights
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {data.exercises.map((ex) => (
                  <div
                    key={ex.name}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '18px 0',
                      borderBottom: '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    <span
                      style={{
                        fontSize: 30,
                        fontWeight: 700,
                        color: '#e2e8f0',
                        maxWidth: '58%',
                      }}
                    >
                      {ex.name}
                    </span>
                    <span
                      style={{
                        fontSize: 26,
                        fontWeight: 600,
                        color: '#94a3b8',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {ex.detail}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <div
            style={{
              marginTop: 'auto',
              paddingTop: 40,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
            }}
          >
            <div>
              <p
                style={{
                  margin: 0,
                  fontSize: 22,
                  fontWeight: 800,
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  color: '#64748b',
                }}
              >
                Streak
              </p>
              <p style={{ margin: '8px 0 0', fontSize: 44, fontWeight: 900, color: '#1D9E75' }}>
                {data.streak} day{data.streak === 1 ? '' : 's'}
              </p>
            </div>
            <p style={{ margin: 0, fontSize: 24, fontWeight: 600, color: '#475569' }}>
              TripMate FitTrack
            </p>
          </div>
        </div>
      </div>
    );
  }
);
