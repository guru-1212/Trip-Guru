'use client';

import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/store';
import { fetchMemories } from '@/features/memories/memoriesThunks';

export function useMemories(tripId: string) {
  const dispatch = useAppDispatch();
  const { memories, loading } = useAppSelector((s) => s.memories);

  useEffect(() => {
    if (tripId) dispatch(fetchMemories(tripId));
  }, [dispatch, tripId]);

  return { memories, loading };
}
