'use client';

import { useParams } from 'next/navigation';
import { TripPageShell } from '@/components/trips/TripPageShell';
import { MemoryGrid } from '@/components/memories/MemoryGrid';
import { MemoryUpload } from '@/components/memories/MemoryUpload';
import { useMemories } from '@/hooks/useMemories';
import { useAuth } from '@/hooks/useAuth';
import { useAppDispatch } from '@/store';
import { deleteMemoryThunk } from '@/features/memories/memoriesThunks';
import { EmptyState } from '@/components/common/EmptyState';
import { Camera } from 'lucide-react';

export default function TripMemoriesPage() {
  const params = useParams();
  const tripId = params.tripId as string;

  return (
    <TripPageShell tripId={tripId}>
      <MemoriesContent tripId={tripId} />
    </TripPageShell>
  );
}

function MemoriesContent({ tripId }: { tripId: string }) {
  const { uid } = useAuth();
  const dispatch = useAppDispatch();
  const { memories, loading } = useMemories(tripId);

  return (
    <div className="space-y-6">
      {uid && <MemoryUpload tripId={tripId} uploadedBy={uid} />}
      {loading ? (
        <p className="text-muted-foreground text-center py-8">Loading memories...</p>
      ) : memories.length === 0 ? (
        <EmptyState
          icon={Camera}
          title="No memories yet"
          description="Upload photos, videos, or notes from your trip."
        />
      ) : (
        <MemoryGrid
          memories={memories}
          currentUserId={uid ?? ''}
          onDelete={(id) => dispatch(deleteMemoryThunk(id))}
        />
      )}
    </div>
  );
}
