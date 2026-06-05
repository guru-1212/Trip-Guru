'use client';

import { Toaster } from 'react-hot-toast';
import { WorkoutProvider } from '@/workout/WorkoutContext';
import { WorkoutSidebar } from '@/components/workout/WorkoutSidebar';
import { WorkoutBottomNav } from '@/components/workout/WorkoutBottomNav';
import '@/workout/workout.css';

export default function WorkoutLayout({ children }: { children: React.ReactNode }) {
  return (
    <WorkoutProvider>
      <div className="ft-app">
        <WorkoutSidebar />
        <main className="lg:ml-64 min-h-screen pb-20 lg:pb-6">
          <div className="max-w-7xl mx-auto px-4 py-6">{children}</div>
        </main>
        <WorkoutBottomNav />
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: '#222222',
              color: '#F5F5F5',
              border: '1px solid #333',
            },
            success: { iconTheme: { primary: '#1D9E75', secondary: '#F5F5F5' } },
            error: { iconTheme: { primary: '#A32D2D', secondary: '#F5F5F5' } },
          }}
        />
      </div>
    </WorkoutProvider>
  );
}
