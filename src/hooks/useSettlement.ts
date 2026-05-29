'use client';

import { useEffect, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '@/store';
import { fetchSettlements, computeSettlementsThunk } from '@/features/settlements/settlementsThunks';
import { getMemberKey } from '@/lib/utils';

export function useSettlement(tripId: string) {
  const dispatch = useAppDispatch();
  const { settlements, computed, loading } = useAppSelector((s) => s.settlements);
  const expenses = useAppSelector((s) => s.expenses.expenses);
  const members = useAppSelector((s) => s.trips.members);

  useEffect(() => {
    if (tripId) dispatch(fetchSettlements(tripId));
  }, [dispatch, tripId]);

  const recompute = useCallback(() => {
    dispatch(computeSettlementsThunk({ tripId, expenses, members }));
  }, [dispatch, tripId, expenses, members]);

  useEffect(() => {
    if (expenses.length > 0 && members.length > 0) {
      recompute();
    }
  }, [expenses, members, recompute]);

  const getMemberName = (uid: string) => {
    const m = members.find((x) => getMemberKey(x) === uid);
    return m?.name ?? uid;
  };

  return {
    settlements,
    computed,
    loading,
    recompute,
    getMemberName,
  };
}
