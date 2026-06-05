'use client';

interface ConsistencyGaugeProps {
  score: number;
  size?: number;
}

export function ConsistencyGauge({ score, size = 160 }: ConsistencyGaugeProps) {
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 70 ? '#1D9E75' : score >= 40 ? '#BA7517' : '#A32D2D';

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="wk-ring-progress">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#333"
          strokeWidth="12"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="12"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="wk-heading text-3xl font-bold">{score}</span>
        <span className="text-xs text-[var(--wk-muted)]">/ 100</span>
      </div>
    </div>
  );
}
