import { Timestamp } from 'firebase/firestore';

export type SettlementStatus = 'pending' | 'paid';

export interface Settlement {
  id: string;
  tripId: string;
  fromUid: string;
  toUid: string;
  amount: number;
  status: SettlementStatus;
  paidAt: Timestamp | null;
}
