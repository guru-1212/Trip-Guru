'use client';

import { forwardRef } from 'react';
import type { PRShareCardData } from '@/workout/shareCard';

const CARD_WIDTH = 1080;
const CARD_HEIGHT = 1920;

type PRShareCardProps = {
  data: PRShareCardData;
};

export const PRShareCard = forwardRef<HTMLDivElement, PRShareCardProps>(
  function PRShareCard({ data }, ref) {
    const isWall = data.mode === 'wall';
    const singleLift = !isWall ? data.lifts[0] : null;

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
            background: 'radial-gradient(circle, rgba(251,191,36,0.3) 0%, transparent 70%)',
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
            background: 'radial-gradient(circle, rgba(29,158,117,0.25) 0%, transparent 70%)',
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <p
              style={{
                margin: 0,
                fontSize: 44,
                fontWeight: 900,
                letterSpacing: '-0.02em',
                color: '#f8fafc',
              }}
            >
              {data.athleteName}
            </p>
            <span style={{ fontSize: 56 }}>🏆</span>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 48 }}>
            {['#fbbf24', '#f59e0b', '#d97706'].map((color) => (
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

          {isWall ? (
            <>
              <div style={{ marginTop: 56 }}>
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
                  Personal Records
                </p>
                <h1
                  style={{
                    margin: '20px 0 0',
                    fontSize: 88,
                    fontWeight: 900,
                    lineHeight: 1.05,
                    letterSpacing: '-0.03em',
                    color: '#fbbf24',
                  }}
                >
                  Wall of Fame
                </h1>
              </div>

              <div
                style={{
                  marginTop: 56,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 28,
                  flex: 1,
                }}
              >
                {data.lifts.map((lift) => (
                  <div
                    key={lift.exerciseId}
                    style={{
                      background: 'rgba(251,191,36,0.12)',
                      border: '1px solid rgba(251,191,36,0.35)',
                      borderRadius: 28,
                      padding: '36px 40px',
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        fontSize: 24,
                        fontWeight: 800,
                        letterSpacing: '0.2em',
                        textTransform: 'uppercase',
                        color: '#94a3b8',
                      }}
                    >
                      {lift.name}
                    </p>
                    <p
                      style={{
                        margin: '16px 0 0',
                        fontSize: 72,
                        fontWeight: 900,
                        color: '#fbbf24',
                        fontVariantNumeric: 'tabular-nums',
                        lineHeight: 1,
                      }}
                    >
                      {lift.estimated1RMLabel}
                    </p>
                    <p
                      style={{
                        margin: '12px 0 0',
                        fontSize: 30,
                        fontWeight: 600,
                        color: '#e2e8f0',
                      }}
                    >
                      Est. 1RM · {lift.actualSet}
                    </p>
                    <p
                      style={{
                        margin: '8px 0 0',
                        fontSize: 24,
                        fontWeight: 500,
                        color: '#64748b',
                      }}
                    >
                      {lift.dateLabel} · {lift.variation}
                    </p>
                  </div>
                ))}
              </div>
            </>
          ) : (
            singleLift && (
              <>
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
                    Personal Record
                  </p>
                  <h1
                    style={{
                      margin: '20px 0 0',
                      fontSize: 80,
                      fontWeight: 900,
                      lineHeight: 1.05,
                      letterSpacing: '-0.03em',
                      color: '#ffffff',
                    }}
                  >
                    {singleLift.name}
                  </h1>
                </div>

                <div
                  style={{
                    marginTop: 80,
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      fontSize: 28,
                      fontWeight: 800,
                      letterSpacing: '0.2em',
                      textTransform: 'uppercase',
                      color: '#fbbf24',
                    }}
                  >
                    Estimated 1RM
                  </p>
                  <p
                    style={{
                      margin: '24px 0 0',
                      fontSize: 140,
                      fontWeight: 900,
                      color: '#fbbf24',
                      fontVariantNumeric: 'tabular-nums',
                      lineHeight: 1,
                      letterSpacing: '-0.03em',
                    }}
                  >
                    {singleLift.estimated1RMLabel}
                  </p>
                  <p
                    style={{
                      margin: '32px 0 0',
                      fontSize: 40,
                      fontWeight: 700,
                      color: '#e2e8f0',
                    }}
                  >
                    {singleLift.actualSet}
                  </p>
                  <p
                    style={{
                      margin: '16px 0 0',
                      fontSize: 30,
                      fontWeight: 500,
                      color: '#64748b',
                    }}
                  >
                    {singleLift.dateLabel} · {singleLift.variation}
                  </p>
                </div>
              </>
            )
          )}

          <div
            style={{
              marginTop: 'auto',
              paddingTop: 40,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
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
              FitTrack
            </p>
            <p style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#64748b' }}>
              Developer Guru
            </p>
          </div>
        </div>
      </div>
    );
  }
);
