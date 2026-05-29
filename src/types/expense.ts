import { Timestamp } from 'firebase/firestore';

export type ExpenseCategory =
  | 'Food'
  | 'Hotel'
  | 'Petrol'
  | 'Toll'
  | 'Shopping'
  | 'Ticket'
  | 'Emergency'
  | 'Misc';

export type SplitType = 'equal' | 'unequal' | 'percent' | 'single';

export interface SplitEntry {
  uid: string;
  amount: number;
}

export interface Expense {
  id: string;
  tripId: string;
  amount: number;
  category: ExpenseCategory;
  paidBy: string;
  splitType: SplitType;
  splitBetween: SplitEntry[];
  receiptURL: string;
  note: string;
  createdBy: string;
  createdAt: Timestamp;
}
