'use client';

import { useEffect, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '@/store';
import { computeRoomSettlements } from '@/lib/settlementAlgorithm';
import { getCarryForwardBalances, getRoomSettlements } from '@/firebase/firestore';
import {
  setComputed,
  setRoomSettlements,
  setCarryForward,
} from '@/features/roomSettlements/roomSettlementsSlice';
import { getMemberKey } from '@/lib/utils';

export function useRoomSettlement(roomId: string) {
  const dispatch = useAppDispatch();
  const expenses = useAppSelector((s) => s.roomExpenses.expenses);
  const members = useAppSelector((s) => s.rooms.members);
  const computed = useAppSelector((s) => s.roomSettlements.computed);
  const settlements = useAppSelector((s) => s.roomSettlements.settlements);
  const carryForward = useAppSelector((s) => s.roomSettlements.carryForward);

  const recompute = useCallback(() => {
    const pending = carryForward.filter((c) => c.status !== 'settled');
    const result = computeRoomSettlements(
      expenses,
      members,
      roomId,
      pending
    );
    dispatch(setComputed(result));
  }, [expenses, members, roomId, carryForward, dispatch]);

  useEffect(() => {
    recompute();
  }, [recompute]);

  useEffect(() => {
    async function load() {
      const [cf, saved] = await Promise.all([
        getCarryForwardBalances(roomId),
        getRoomSettlements(roomId),
      ]);
      dispatch(setCarryForward(cf));
      dispatch(setRoomSettlements(saved));
    }
    load();
  }, [roomId, dispatch]);

  const getMemberName = (memberKey: string) => {
    const m = members.find((x) => getMemberKey(x) === memberKey);
    return m?.name ?? 'Unknown';
  };

  return {
    computed,
    settlements,
    carryForward,
    getMemberName,
    recompute,
  };
}
