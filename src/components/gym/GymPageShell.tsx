'use client';

import { ProtectedRoute } from '@/components/common/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import { PageBackNav } from '@/components/common/PageBackNav';
import { Dumbbell } from 'lucide-react';
import { GymNav } from '@/components/gym/GymNav';
import { useGym } from '@/hooks/useGym';
import { useRealtimeGym } from '@/hooks/useRealtimeGym';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

export function GymPageShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <AppShell>
        <GymPageContent title={title} subtitle={subtitle}>
          {children}
        </GymPageContent>
      </AppShell>
    </ProtectedRoute>
  );
}

function GymPageContent({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const { uid, loading } = useGym();
  useRealtimeGym(uid);

  if (loading && !uid) {
    return <LoadingSpinner label="Loading gym tracker..." />;
  }

  return (
    <div className="space-y-6">
      <PageBackNav />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl md:text-4xl font-black tracking-tight flex items-center gap-3">
            <Dumbbell className="h-8 w-8 text-primary" />
            {title}
          </h1>
          {subtitle ? <p className="text-sm text-muted-foreground font-medium">{subtitle}</p> : null}
        </div>
      </div>
      <GymNav />
      {children}
    </div>
  );
}
