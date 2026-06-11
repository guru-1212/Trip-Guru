'use client';

import { useState } from 'react';
import { PageTransition } from '@/components/workout/PageTransition';
import { WorkoutAnalytics } from '@/components/analytics/WorkoutAnalytics';
import { DietAnalytics } from '@/components/analytics/DietAnalytics';
import { cn } from '@/lib/utils';
import { Dumbbell, Utensils } from 'lucide-react';

type AnalyticsTab = 'workout' | 'diet';

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('workout');

  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
          <h1 className="ft-title text-3xl font-black">Analytics</h1>
          
          <div className="flex bg-muted/50 p-1.5 rounded-2xl w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('workout')}
              className={cn(
                "flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-200",
                activeTab === 'workout' 
                  ? "bg-background text-primary shadow-sm" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Dumbbell className={cn("h-4 w-4", activeTab === 'workout' ? "text-primary" : "text-muted-foreground")} />
              Workout
            </button>
            <button
              onClick={() => setActiveTab('diet')}
              className={cn(
                "flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-200",
                activeTab === 'diet' 
                  ? "bg-background text-primary shadow-sm" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Utensils className={cn("h-4 w-4", activeTab === 'diet' ? "text-primary" : "text-muted-foreground")} />
              Diet
            </button>
          </div>
        </div>

        <div className="min-h-[400px]">
          {activeTab === 'workout' ? (
            <WorkoutAnalytics />
          ) : (
            <DietAnalytics />
          )}
        </div>
      </div>
    </PageTransition>
  );
}
