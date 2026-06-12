'use client';

import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { YogaSessionLog, MeditationLog } from '@/types/yoga';
import dayjs from 'dayjs';
import { Activity } from 'lucide-react';

interface YogaWeeklyAnalyticsProps {
  sessionLogs: YogaSessionLog[];
  meditationLogs: MeditationLog[];
}

export function YogaWeeklyAnalytics({ sessionLogs, meditationLogs }: YogaWeeklyAnalyticsProps) {
  const data = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      return dayjs().subtract(i, 'day').format('YYYY-MM-DD');
    }).reverse();

    return last7Days.map(date => {
      const daySessions = sessionLogs.filter(log => log.date === date);
      const dayZen = meditationLogs.filter(log => log.date === date);
      
      const yogaMinutes = daySessions.reduce((sum, log) => sum + log.durationMinutes, 0);
      const zenMinutes = dayZen.reduce((sum, log) => sum + log.durationMinutes, 0);

      return {
        name: dayjs(date).format('ddd'),
        fullDate: date,
        yoga: yogaMinutes,
        zen: zenMinutes,
      };
    });
  }, [sessionLogs, meditationLogs]);

  return (
    <div className="bg-muted/20 rounded-[40px] p-8 border border-border/50 h-full flex flex-col">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="bg-rose-500/10 p-2 rounded-xl text-rose-500">
            <Activity className="h-5 w-5" />
          </div>
          <h3 className="text-xl font-black">Weekly Progress</h3>
        </div>
        <div className="bg-muted/40 px-3 py-1 rounded-lg">
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Last 7 Days</span>
        </div>
      </div>

      <div className="flex-1 min-h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
            <XAxis 
              dataKey="name" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fontWeight: 800, fill: 'hsl(var(--muted-foreground))' }}
              dy={10}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fontWeight: 800, fill: 'hsl(var(--muted-foreground))' }}
            />
            <Tooltip 
              cursor={{ fill: 'rgba(0,0,0,0.02)' }}
              contentStyle={{ 
                borderRadius: '16px', 
                border: 'none', 
                boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                fontSize: '12px',
                fontWeight: 'bold'
              }}
            />
            <Bar dataKey="yoga" stackId="a" fill="#f43f5e" radius={[0, 0, 0, 0]} />
            <Bar dataKey="zen" stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="flex gap-4 mt-6">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Yoga (mins)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Zen (mins)</span>
        </div>
      </div>
    </div>
  );
}
