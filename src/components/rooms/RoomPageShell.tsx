'use client';

import { ProtectedRoute } from '@/components/common/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import { RoomNav } from './RoomNav';
import { useRoom } from '@/hooks/useRoom';
import { useRealtimeRoom } from '@/hooks/useRealtimeRoom';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { formatCycleLabel } from '@/firebase/firestore';
import { PageBackNav } from '@/components/common/PageBackNav';
import { Home } from 'lucide-react';
import { motion } from 'framer-motion';

export function RoomPageShell({
  roomId,
  children,
}: {
  roomId: string;
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <AppShell>
        <RoomPageContent roomId={roomId}>{children}</RoomPageContent>
      </AppShell>
    </ProtectedRoute>
  );
}

function RoomPageContent({
  roomId,
  children,
}: {
  roomId: string;
  children: React.ReactNode;
}) {
  const { room, activeCycle, loading } = useRoom(roomId);
  useRealtimeRoom(roomId, activeCycle?.id ?? null);

  if (loading && !room) {
    return <LoadingSpinner label="Loading room..." />;
  }

  if (!room) {
    return (
      <p className="text-center text-muted-foreground py-12">Room not found</p>
    );
  }

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        <PageBackNav />

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-2">
            <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
              <Home className="h-8 w-8 text-primary" />
              {room.name}
            </h1>
            {activeCycle && (
              <p className="text-sm font-bold text-muted-foreground">
                Current cycle: {formatCycleLabel(activeCycle)}
              </p>
            )}
          </div>
        </div>
      </motion.div>

      <RoomNav roomId={roomId} />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        {children}
      </motion.div>
    </div>
  );
}
