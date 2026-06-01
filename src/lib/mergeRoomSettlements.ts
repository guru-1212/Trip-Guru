import { RoomComputedSettlement } from '@/lib/settlementAlgorithm';
import { RoomSettlement, RoomSettlementStatus } from '@/types/roomSettlement';
import { Timestamp } from 'firebase/firestore';

export interface DisplayRoomSettlement extends RoomComputedSettlement {
  status: RoomSettlementStatus;
  claimedAt?: Timestamp | null;
  confirmedAt?: Timestamp | null;
  isPersisted: boolean;
}

export function mergeRoomSettlements(
  computed: RoomComputedSettlement[],
  saved: RoomSettlement[],
  cycleId?: string
): DisplayRoomSettlement[] {
  const savedForCycle = saved.filter(
    (s) => !cycleId || s.cycleId === cycleId || !s.cycleId
  );

  return computed.map((c) => {
    const match = savedForCycle.find(
      (s) =>
        s.fromMemberKey === c.fromMemberKey &&
        s.toMemberKey === c.toMemberKey
    );
    const status = match?.status ?? 'pending';
    return {
      ...c,
      id: match?.id ?? c.id,
      amount:
        status === 'pending' ? c.amount : (match?.amount ?? c.amount),
      status,
      claimedAt: match?.claimedAt ?? null,
      confirmedAt: match?.confirmedAt ?? null,
      isPersisted: !!match,
    };
  });
}

export function isSettlementOpen(status: RoomSettlementStatus): boolean {
  return status === 'pending' || status === 'awaiting_confirmation';
}
