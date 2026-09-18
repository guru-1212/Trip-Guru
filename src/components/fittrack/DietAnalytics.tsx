'use client';

import { useMemo, useState } from 'react';
import dayjs from 'dayjs';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp, TrendingDown, Minus, Utensils, Zap, Flame, Target } from 'lucide-react';
import { useDietTracker } from '@/hooks/useDietTracker';
import { WeeklyCalorieChart } from '@/components/nutrition/WeeklyCalorieChart';
import { formatKcal } from '@/lib/nutrition/nutritionUtils';
import { cn } from '@/lib/utils';

export function DietAnalytics() {
  const {
    weeklyLogs,
    targets,
    streak,
    surplusAvg,
    currentWeight,
    dateKey,
    timezone,
    loading
  } = useDietTracker();

  const [range, setRange] = useState<'today' | 'yesterday' | 'week' | 'month'>('month');

  const filteredLogs = useMemo(() => {
    // Current date in target timezone
    const now = new Date();
    const today = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(now);

    const getShiftedKey = (days: number) => {
      const d = new Date(today + 'T12:00:00');
      d.setDate(d.getDate() + days);
      return d.toISOString().slice(0, 10);
    };

    const yesterday = getShiftedKey(-1);
    
    // Find start of week (Sunday as per standard JS/dayjs default)
    const todayObj = new Date(today + 'T12:00:00');
    const dayOfWeek = todayObj.getDay(); // 0 is Sunday
    const startOfWeek = getShiftedKey(-dayOfWeek);
    
    // Start of month
    const startOfMonth = today.slice(0, 8) + '01';

    if (range === 'today') return weeklyLogs.filter(l => l.dateKey === today);
    if (range === 'yesterday') return weeklyLogs.filter(l => l.dateKey === yesterday);
    if (range === 'week') return weeklyLogs.filter(l => l.dateKey >= startOfWeek);
    return weeklyLogs; // monthly by default (30 days from hook)
  }, [weeklyLogs, range, timezone]);

  const avgCalories = useMemo(() => {
    const withData = filteredLogs.filter((l) => l.totals.calories > 0);
    if (withData.length === 0) return 0;
    return Math.round(
      withData.reduce((s, l) => s + l.totals.calories, 0) / withData.length
    );
  }, [filteredLogs]);

  const avgProtein = useMemo(() => {
    const withData = filteredLogs.filter((l) => l.totals.proteinG > 0);
    if (withData.length === 0) return 0;
    return Math.round(
      (withData.reduce((s, l) => s + l.totals.proteinG, 0) / withData.length) * 10
    ) / 10;
  }, [filteredLogs]);

  const macroDonut = useMemo(() => {
    const withData = filteredLogs.filter((l) => l.totals.calories > 0);
    if (withData.length === 0) return [];
    
    const totals = withData.reduce((acc, l) => ({
      protein: acc.protein + l.totals.proteinG,
      carbs: acc.carbs + l.totals.carbsG,
      fat: acc.fat + l.totals.fatG
    }), { protein: 0, carbs: 0, fat: 0 });

    const totalGrams = totals.protein + totals.carbs + totals.fat;
    if (totalGrams === 0) return [];

    return [
      { name: 'Protein', value: Math.round((totals.protein / totalGrams) * 100), fill: '#378ADD' },
      { name: 'Carbs', value: Math.round((totals.carbs / totalGrams) * 100), fill: '#1D9E75' },
      { name: 'Fat', value: Math.round((totals.fat / totalGrams) * 100), fill: '#D1A032' },
    ];
  }, [filteredLogs]);

  if (loading && weeklyLogs.length === 0) return <div className="text-muted-foreground">Loading diet data...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-xl font-bold">Diet Analytics</h2>
        <select 
          className="ft-input w-auto text-sm" 
          value={range} 
          onChange={(e) => setRange(e.target.value as any)}
        >
          <option value="today">Today</option>
          <option value="yesterday">Yesterday</option>
          <option value="week">This Week</option>
          <option value="month">Last 30 Days</option>
        </select>
      </div>

      {/* Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <OverviewCard 
          label="Avg Calories" 
          value={`${formatKcal(avgCalories)}`} 
          subValue={`Target: ${formatKcal(targets.calories)}`}
          icon={Flame}
          status={avgCalories > targets.calories ? 'surplus' : 'deficit'}
        />
        <OverviewCard 
          label="Avg Protein" 
          value={`${avgProtein}g`} 
          subValue={`Target: ${targets.proteinG}g`}
          icon={Zap}
        />
        <OverviewCard 
          label="Current Streak" 
          value={`${streak} days`} 
          subValue="Consistency"
          icon={Target}
        />
        <OverviewCard 
          label="Surplus/Deficit" 
          value={`${surplusAvg > 0 ? '+' : ''}${surplusAvg} kcal`} 
          subValue="Daily Average"
          icon={TrendingUp}
          invert={surplusAvg < 0}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <WeeklyCalorieChart 
          logs={weeklyLogs} 
          currentDateKey={dateKey} 
          targetCalories={targets.calories} 
          className="!bg-transparent !border-none !p-0 shadow-none"
        />
        
        <div className="ft-card ft-card-padded">
          <h3 className="ft-title font-semibold mb-4">Macro Distribution (30d)</h3>
          {macroDonut.length > 0 ? (
            <div className="flex flex-col items-center">
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie 
                    data={macroDonut} 
                    dataKey="value" 
                    nameKey="name" 
                    cx="50%" 
                    cy="50%" 
                    innerRadius={60} 
                    outerRadius={80} 
                    paddingAngle={5}
                    label={({ name, value }) => `${name} ${value}%`}
                  >
                    {macroDonut.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#222', border: '1px solid #333', borderRadius: '8px' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex gap-4 mt-2">
                {macroDonut.map(m => (
                  <div key={m.name} className="flex items-center gap-1.5 text-xs font-medium">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: m.fill }} />
                    <span className="text-muted-foreground">{m.name}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm text-center py-16">No macro data logged</p>
          )}
        </div>
      </div>

      <div className="ft-card ft-card-padded">
        <h3 className="ft-title font-semibold mb-4">Weight Insight</h3>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
             <Utensils className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium">Current Weight: <span className="text-primary">{currentWeight} kg</span></p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Based on your 30-day average intake of {formatKcal(avgCalories)} kcal, you are in a 
              <span className={surplusAvg > 0 ? 'text-primary font-bold' : 'text-emerald-500 font-bold'}>
                {surplusAvg > 0 ? ` surplus of ${surplusAvg}` : ` deficit of ${Math.abs(surplusAvg)}`} kcal/day
              </span>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function OverviewCard({ 
  label, 
  value, 
  subValue, 
  icon: Icon,
  status,
  invert 
}: { 
  label: string; 
  value: string; 
  subValue: string; 
  icon: any;
  status?: 'surplus' | 'deficit';
  invert?: boolean;
}) {
  return (
    <div className="ft-card ft-card-padded">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
          <Icon className="h-4 w-4" />
        </div>
        <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">{label}</p>
      </div>
      <p className="ft-title text-xl font-bold">{value}</p>
      <p className="text-[10px] text-muted-foreground font-medium mt-1">{subValue}</p>
      {status && (
        <div className={cn(
          "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase mt-2",
          status === 'surplus' ? "bg-primary/10 text-primary" : "bg-emerald-500/10 text-emerald-500"
        )}>
          {status === 'surplus' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {status}
        </div>
      )}
    </div>
  );
}
