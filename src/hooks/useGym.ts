'use client';

import { useEffect } from 'react';
import dayjs from 'dayjs';
import { useAuth } from '@/hooks/useAuth';
import { useAppDispatch, useAppSelector } from '@/store';
import { loadGymData } from '@/features/gym/gymThunks';

export function useGym() {
  const { uid } = useAuth();
  const dispatch = useAppDispatch();
  const gym = useAppSelector((s) => s.gym);
  const dateKey = dayjs().format('YYYY-MM-DD');

  useEffect(() => {
    if (!uid) return;
    dispatch(loadGymData({ uid, dateKey }));
  }, [uid, dispatch, dateKey]);

  return { uid, dateKey, ...gym };
}
