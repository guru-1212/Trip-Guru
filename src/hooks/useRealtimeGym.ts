'use client';

import { useEffect } from 'react';
import dayjs from 'dayjs';
import { useAppDispatch } from '@/store';
import { loadGymData } from '@/features/gym/gymThunks';

/**
 * Lightweight realtime refresh based on polling interval.
 * Keeps implementation simple until we add snapshot listeners.
 */
export function useRealtimeGym(uid?: string | null) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (!uid) return;
    const dateKey = dayjs().format('YYYY-MM-DD');
    const interval = setInterval(() => {
      dispatch(loadGymData({ uid, dateKey }));
    }, 20000);

    return () => clearInterval(interval);
  }, [uid, dispatch]);
}
