'use client';

import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, CheckCircle2, Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { YogaSessionLog, MeditationLog } from '@/types/yoga';
import { Button } from '@/components/ui/button';

interface YogaAttendanceCalendarProps {
  sessionLogs: YogaSessionLog[];
  meditationLogs: MeditationLog[];
}

export function YogaAttendanceCalendar({ sessionLogs, meditationLogs }: YogaAttendanceCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

  const activityMap = useMemo(() => {
    const map: Record<string, { yoga: boolean; zen: boolean }> = {};
    
    sessionLogs.forEach(log => {
      if (!map[log.date]) map[log.date] = { yoga: false, zen: false };
      map[log.date].yoga = true;
    });

    meditationLogs.forEach(log => {
      if (!map[log.date]) map[log.date] = { yoga: false, zen: false };
      map[log.date].zen = true;
    });

    return map;
  }, [sessionLogs, meditationLogs]);

  const monthName = currentDate.toLocaleString('default', { month: 'long' });
  const year = currentDate.getFullYear();

  const prevMonth = () => setCurrentDate(new Date(year, currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, currentDate.getMonth() + 1, 1));

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const emptyDays = Array.from({ length: firstDayOfMonth }, (_, i) => i);

  return (
    <div className="bg-muted/20 rounded-[40px] p-8 border border-border/50">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2 rounded-xl text-primary">
            <CalendarIcon className="h-5 w-5" />
          </div>
          <h3 className="text-xl font-black">{monthName} {year}</h3>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={prevMonth} className="rounded-xl"><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" onClick={nextMonth} className="rounded-xl"><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2 mb-4">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
          <div key={d} className="text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground py-2">{d}</div>
        ))}
        
        {emptyDays.map(i => <div key={`e-${i}`} />)}
        
        {days.map(day => {
          const dateKey = `${year}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
          const activity = activityMap[dateKey];
          const isToday = new Date().toISOString().split('T')[0] === dateKey;

          return (
            <div 
              key={day} 
              className={cn(
                "aspect-square rounded-2xl flex flex-col items-center justify-center relative transition-all group border border-transparent",
                isToday ? "bg-primary/5 border-primary/20" : "hover:bg-muted/40"
              )}
            >
              <span className={cn(
                "text-sm font-bold mb-1",
                isToday ? "text-primary" : "text-muted-foreground"
              )}>{day}</span>
              
              <div className="flex gap-1">
                {activity?.yoga && <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-sm" />}
                {activity?.zen && <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-sm" />}
              </div>

              {activity?.yoga && activity?.zen && (
                <CheckCircle2 className="absolute -top-1 -right-1 h-3.5 w-3.5 text-emerald-500 fill-white" />
              )}
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-4 mt-8 pt-6 border-t border-border/50">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-rose-500" />
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Yoga Session</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-amber-500" />
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Meditation</span>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Full Zen Achieved</span>
        </div>
      </div>
    </div>
  );
}
