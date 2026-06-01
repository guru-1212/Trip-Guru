import { Timestamp } from 'firebase/firestore';

export type RoomSettlementStatus =
  | 'pending'
  | 'awaiting_confirmation'
  | 'paid';
export type RoomSettlementSource = 'computed' | 'carry_forward' | 'manual';

export interface RoomSettlement {
  id: string;
  roomId: string;
  cycleId?: string;
  fromMemberKey: string;
  toMemberKey: string;
  amount: number;
  status: RoomSettlementStatus;
  source: RoomSettlementSource;
  paidAt: Timestamp | null;
  /** When the debtor marked that they paid the creditor */
  claimedAt?: Timestamp | null;
  /** When the creditor confirmed receipt */
  confirmedAt?: Timestamp | null;
}

export interface CarryForwardBalance {
  id: string;
  roomId: string;
  fromMemberKey: string;
  toMemberKey: string;
  amount: number;
  status: 'pending' | 'partial' | 'settled';
  originCycleId: string;
  updatedAt: Timestamp;
}

export interface RentPayment {
  id: string;
  roomId: string;
  cycleId: string;
  memberKey: string;
  amount: number;
  status: 'pending' | 'paid';
  paidAt: Timestamp | null;
}
