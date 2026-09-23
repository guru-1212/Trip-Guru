'use client';

import {
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { cn } from '@/lib/utils';
import { getTargetRepHistory } from '@/workout/targets';
import type { Target, TargetAttempt } from '@/workout/targets';

interface TargetProgressChartProps {
  target: Target;
  attempts: TargetAttempt[];
  className?: string;
}

/**
 * Top set over time against the goal line. Uses hsl(var(--…)) tokens so it reads
 * correctly in light and dark — WorkoutAnalytics' hardcoded hex does not.
 */
export function TargetProgressChart({ target, attempts, className }: TargetProgressChartProps) {
  const data = getTargetRepHistory(target, attempts);

  if (data.length < 2) {
    return (
      <p className={cn('text-sm text-muted-foreground text-center py-8', className)}>
        Log a couple of sessions and your climb shows up here.
      </p>
    );
  }

  const max = Math.max(target.goalValue, ...data.map((d) => d.topSet));

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <XAxis
            dataKey="label"
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
          />
          <YAxis
            domain={[0, Math.ceil(max * 1.05)]}
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
          />
          <Tooltip
            contentStyle={{
              background: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          <ReferenceLine
            y={target.goalValue}
            stroke="hsl(var(--muted-foreground))"
            strokeDasharray="4 4"
            label={{
              value: `Goal ${target.goalValue}`,
              position: 'insideTopRight',
              fill: 'hsl(var(--muted-foreground))',
              fontSize: 11,
            }}
          />
          <Line
            type="monotone"
            dataKey="topSet"
            name="Top set"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
