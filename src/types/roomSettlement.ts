import { Timestamp } from 'firebase/firestore';

export type RoomSettlementStatus = 'pending' | 'paid';
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
