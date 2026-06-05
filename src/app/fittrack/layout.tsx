'use client';

import { Toaster } from 'react-hot-toast';
import { WorkoutProvider } from '@/workout/WorkoutContext';
import { WorkoutSidebar } from '@/components/workout/WorkoutSidebar';
import { WorkoutBottomNav } from '@/components/workout/WorkoutBottomNav';
import '@/workout/workout.css';

export default function FitTrackLayout({ children }: { children: React.ReactNode }) {
  return (
    <WorkoutProvider>
      <div className="min-h-screen bg-background text-foreground">
        <WorkoutSidebar />
        <main className="lg:ml-80 min-h-screen pb-20 lg:pb-6 relative">
          <div className="container mx-auto px-4 sm:px-6 lg:px-12 py-6 md:py-10 pb-32 lg:pb-12 max-w-[1400px]">
            {children}
          </div>
        </main>
        <WorkoutBottomNav />
        <Toaster
          position="top-center"
          toastOptions={{
            className: 'bg-background text-foreground border border-border shadow-2xl rounded-2xl font-bold text-sm',
            success: { iconTheme: { primary: 'hsl(var(--primary))', secondary: 'white' } },
          }}
        />
      </div>
    </WorkoutProvider>
  );
}
