'use client';

import { Toaster } from 'react-hot-toast';
import { ProtectedRoute } from '@/components/common/ProtectedRoute';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { WorkoutProvider, useWorkoutStore } from '@/workout/WorkoutContext';
import { WorkoutSidebar } from '@/components/workout/WorkoutSidebar';
import { WorkoutBottomNav } from '@/components/workout/WorkoutBottomNav';
import { Navbar } from '@/components/layout/Navbar';
import '@/fittrack/fittrack.css';

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
    <div className="ft-app min-h-screen bg-background text-foreground">
      <Navbar />
      <div className="flex">
        <WorkoutSidebar />
        <main className="flex-1 min-h-[calc(100vh-4rem)] pb-20 lg:pb-8 relative overflow-x-hidden">
          <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 py-6 md:py-8 pb-28 lg:pb-10">
            {children}
          </div>
        </main>
      </div>
      <WorkoutBottomNav />
    </div>
  );
}

export default function FitTrackLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <WorkoutProvider>
        <FitTrackShell>{children}</FitTrackShell>
        <Toaster
          position="top-center"
          toastOptions={{
            className: 'bg-background text-foreground border border-border shadow-2xl rounded-2xl font-bold text-sm',
            success: { iconTheme: { primary: 'hsl(var(--primary))', secondary: 'white' } },
          }}
        />
      </WorkoutProvider>
    </ProtectedRoute>
  );
}
