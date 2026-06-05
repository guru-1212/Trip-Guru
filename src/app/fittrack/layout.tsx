'use client';

import { Toaster } from 'react-hot-toast';
import { ProtectedRoute } from '@/components/common/ProtectedRoute';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { WorkoutProvider, useWorkoutStore } from '@/workout/WorkoutContext';
import { WorkoutSidebar } from '@/components/workout/WorkoutSidebar';
import { WorkoutBottomNav } from '@/components/workout/WorkoutBottomNav';
import '@/workout/workout.css';

function FitTrackShell({ children }: { children: React.ReactNode }) {
  const { hydrated, syncing } = useWorkoutStore();

  if (!hydrated || syncing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner label="Syncing FitTrack from cloud..." />
      </div>
    );
  }

  return (
    <>
      <WorkoutSidebar />
      <main className="lg:ml-80 min-h-screen pb-20 lg:pb-6 relative">
        <div className="container mx-auto px-4 sm:px-6 lg:px-12 py-6 md:py-10 pb-32 lg:pb-12 max-w-[1400px]">
          {children}
        </div>
      </main>
      <WorkoutBottomNav />
    </>
  );
}

export default function FitTrackLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
    <WorkoutProvider>
      <div className="min-h-screen bg-background text-foreground">
        <FitTrackShell>{children}</FitTrackShell>
        <Toaster
          position="top-center"
          toastOptions={{
            className: 'bg-background text-foreground border border-border shadow-2xl rounded-2xl font-bold text-sm',
            success: { iconTheme: { primary: 'hsl(var(--primary))', secondary: 'white' } },
          }}
        />
      </div>
    </WorkoutProvider>
    </ProtectedRoute>
  );
}
