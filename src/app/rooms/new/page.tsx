'use client';

import { ProtectedRoute } from '@/components/common/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import { RoomForm } from '@/components/rooms/RoomForm';

export default function NewRoomPage() {
  return (
    <ProtectedRoute>
      <AppShell>
        <div className="max-w-lg mx-auto py-8 space-y-6">
          <h1 className="text-3xl font-black">Create room</h1>
          <p className="text-muted-foreground text-sm">
            Set up a shared home or PG to track monthly expenses and settlements.
          </p>
          <RoomForm />
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
