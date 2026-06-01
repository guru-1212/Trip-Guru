'use client';

import { useEffect, useCallback, useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '@/store';
import { computeRoomSettlements } from '@/lib/settlementAlgorithm';
import {
  getCarryForwardBalances,
  getRoomSettlements,
  syncRoomSettlements,
} from '@/firebase/firestore';
import {
  setComputed,
  setRoomSettlements,
  setCarryForward,
} from '@/features/roomSettlements/roomSettlementsSlice';
import { getMemberKey } from '@/lib/utils';
import {
  mergeRoomSettlements,
  DisplayRoomSettlement,
} from '@/lib/mergeRoomSettlements';

export function useRoomSettlement(roomId: string) {
  const dispatch = useAppDispatch();
  const expenses = useAppSelector((s) => s.roomExpenses.expenses);
  const members = useAppSelector((s) => s.rooms.members);
  const cycle = useAppSelector((s) => s.rooms.activeCycle);
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

  const computedKey = useMemo(
    () =>
      JSON.stringify(
        computed.map((c) => [
          c.fromMemberKey,
          c.toMemberKey,
          c.amount,
        ])
      ),
    [computed]
  );

  useEffect(() => {
    if (!roomId || computed.length === 0) return;
    let cancelled = false;
    syncRoomSettlements(roomId, cycle?.id, computed).then((all) => {
      if (!cancelled) dispatch(setRoomSettlements(all));
    });
    return () => {
      cancelled = true;
    };
  }, [roomId, cycle?.id, computedKey, computed, dispatch]);

  const displaySettlements: DisplayRoomSettlement[] = useMemo(
    () => mergeRoomSettlements(computed, settlements, cycle?.id),
    [computed, settlements, cycle?.id]
  );

  const getMemberName = (memberKey: string) => {
    const m = members.find((x) => getMemberKey(x) === memberKey);
    return m?.name ?? 'Unknown';
  };

  const refreshSettlements = useCallback(async () => {
    const saved = await getRoomSettlements(roomId);
    dispatch(setRoomSettlements(saved));
  }, [roomId, dispatch]);

  return {
    computed,
    displaySettlements,
    settlements,
    carryForward,
    cycle,
    getMemberName,
    recompute,
    refreshSettlements,
  };
}
