'use client';

import { forwardRef } from 'react';

const W = 1080;
const H = 1920;
const FONT = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
const ACCENT = '#4f46e5';

export interface BodyShareData {
  athleteName: string;
  handle: string;
  weekRange: string;
  total: number;
  topGroups: string;
  frontUrl: string;
  backUrl: string;
  days: { label: string; num: string; worked: boolean }[];
}

export const BodyShareCard = forwardRef<HTMLDivElement, { data: BodyShareData }>(function BodyShareCard({ data }, ref) {
  return (
    <div
      ref={ref}
      style={{
        width: W,
        height: H,
        boxSizing: 'border-box',
        fontFamily: FONT,
        background: 'linear-gradient(160deg, #f1f5f9 0%, #e2e8f0 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '64px 56px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 968,
          background: '#ffffff',
          border: '1px solid #eef2f7',
          borderRadius: 56,
          boxShadow: '0 30px 80px rgba(15,23,42,0.14)',
          padding: '60px 56px',
          boxSizing: 'border-box',
          color: '#0f172a',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 38, fontWeight: 900, color: ACCENT, letterSpacing: '-0.01em' }}>FitTrack</span>
          <span style={{ fontSize: 30, fontWeight: 700, color: '#64748b' }}>{data.handle}</span>
        </div>

        {/* Title */}
        <div style={{ marginTop: 40 }}>
          <h1 style={{ margin: 0, fontSize: 62, fontWeight: 900, letterSpacing: '-0.02em' }}>Body Distribution</h1>
          <p style={{ margin: '12px 0 0', fontSize: 32, fontWeight: 600, color: '#64748b' }}>{data.weekRange}</p>
          <p style={{ margin: '10px 0 0', fontSize: 28, fontWeight: 700, color: ACCENT }}>
            {data.total} sets{data.topGroups ? ` · ${data.topGroups}` : ''}
          </p>
        </div>

        {/* Figures */}
        <div style={{ marginTop: 36, display: 'flex', gap: 24, justifyContent: 'center', alignItems: 'flex-start' }}>
          <img src={data.frontUrl} alt="Front" style={{ width: '48%', height: 'auto' }} />
          <img src={data.backUrl} alt="Back" style={{ width: '48%', height: 'auto' }} />
        </div>

        {/* Day chips */}
        <div style={{ marginTop: 44, display: 'flex', justifyContent: 'space-between' }}>
          {data.days.map((d, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: 26, fontWeight: 800, color: '#94a3b8' }}>{d.label}</p>
              <div
                style={{
                  width: 78,
                  height: 78,
                  borderRadius: '50%',
                  margin: '12px auto 0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: d.worked ? '#2563eb' : '#eef2f7',
                  color: d.worked ? '#ffffff' : '#94a3b8',
                  fontSize: 34,
                  fontWeight: 800,
                }}
              >
                {d.num}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});
