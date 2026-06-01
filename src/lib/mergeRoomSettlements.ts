import { RoomComputedSettlement } from '@/lib/settlementAlgorithm';
import { RoomSettlement, RoomSettlementStatus } from '@/types/roomSettlement';
import { Timestamp } from 'firebase/firestore';

export interface DisplayRoomSettlement
  extends Omit<RoomComputedSettlement, 'status'> {
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

    let status = match?.status ?? 'pending';
    // New expenses can create fresh debt for the same pair after a prior payment was confirmed.
    if (status === 'paid' && c.amount > 0.01) {
      status = 'pending';
    }

    const useComputedAmount =
      status === 'pending' || status === 'awaiting_confirmation';

    return {
      ...c,
      id: match?.id ?? c.id,
      amount: useComputedAmount ? c.amount : (match?.amount ?? c.amount),
      status,
      claimedAt: status === 'awaiting_confirmation' ? match?.claimedAt ?? null : null,
      confirmedAt: status === 'paid' ? match?.confirmedAt ?? null : null,
      isPersisted: !!match,
    };
  });
}

export function isSettlementOpen(status: RoomSettlementStatus): boolean {
  return status === 'pending' || status === 'awaiting_confirmation';
}
