'use client';

import { ProtectedRoute } from '@/components/common/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import { TripForm } from '@/components/trips/TripForm';

export default function NewTripPage() {
  return (
    <ProtectedRoute>
      <AppShell>
        <div className="max-w-2xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Create new trip</h1>
            <p className="text-muted-foreground">
              Plan your adventure and invite your group
            </p>
          </div>
          <TripForm />
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
