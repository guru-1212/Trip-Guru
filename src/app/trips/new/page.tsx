'use client';

import { ProtectedRoute } from '@/components/common/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import { TripForm } from '@/components/trips/TripForm';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';

export default function NewTripPage() {
  return (
    <ProtectedRoute>
      <AppShell>
        <div className="max-w-2xl mx-auto space-y-6">
          <Link 
            href="/dashboard"
            className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors group"
          >
            <ChevronLeft className="h-3 w-3 transition-transform group-hover:-translate-x-0.5" />
            Back to Dashboard
          </Link>
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
