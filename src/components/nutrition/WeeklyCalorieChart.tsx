'use client';

import { useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import dayjs from 'dayjs';
import { cn } from '@/lib/utils';
import { formatKcal } from '@/lib/nutrition/nutritionUtils';
import type { NutrientsPerServing } from '@/types/nutrition';

interface WeeklyCalorieChartProps {
  logs: { dateKey: string; totals: NutrientsPerServing; targets: NutrientsPerServing }[];
  currentDateKey: string;
  targetCalories: number;
  className?: string;
}

export function WeeklyCalorieChart({
  logs,
  currentDateKey,
  targetCalories,
  className,
}: WeeklyCalorieChartProps) {
  const [range, setRange] = useState<'7d' | '30d'>('7d');

  const chartData = useMemo(() => {
    const days = range === '7d' ? 7 : 30;
    const data = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = dayjs(currentDateKey).subtract(i, 'day');
      const key = d.format('YYYY-MM-DD');
      const log = logs.find((l) => l.dateKey === key);
      data.push({
        dateKey: key,
        label: range === '7d' ? d.format('ddd') : d.format('D'),
        calories: log?.totals.calories ?? 0,
        isToday: key === currentDateKey,
      });
    }
    return data;
  }, [logs, currentDateKey, range]);

  const avgCalories = useMemo(() => {
    const withData = chartData.filter((d) => d.calories > 0);
    if (withData.length === 0) return 0;
    return Math.round(
      withData.reduce((s, d) => s + d.calories, 0) / withData.length
    );
  }, [chartData]);

  return (
    <div className={cn('ft-card ft-card-padded space-y-4', className)}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="ft-title text-base font-semibold">Weekly Calories</h3>
        <div className="flex rounded-lg border border-border overflow-hidden text-xs font-medium">
          {(['7d', '30d'] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={cn(
                'px-3 py-1.5 transition-colors',
                range === r ? 'bg-primary text-primary-foreground' : 'hover:bg-muted/50'
              )}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <XAxis dataKey="label" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
          <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
          <Tooltip
            contentStyle={{
              background: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(value: number) => [`${value} kcal`, 'Intake']}
          />
          <ReferenceLine
            y={targetCalories}
            stroke="hsl(var(--muted-foreground))"
            strokeDasharray="4 4"
          />
          <Bar
            dataKey="calories"
            radius={[4, 4, 0, 0]}
            fill="hsl(var(--primary))"
            opacity={0.7}
            activeBar={{ fill: 'hsl(var(--primary))', opacity: 1 }}
          />
        </BarChart>
      </ResponsiveContainer>

      <p className="text-xs text-muted-foreground text-center">
        Avg this week: <span className="text-foreground font-medium">{formatKcal(avgCalories)} kcal</span>
        {' · '}
        Target: <span className="text-foreground font-medium">{formatKcal(targetCalories)} kcal</span>
      </p>
    </div>
  );
}
