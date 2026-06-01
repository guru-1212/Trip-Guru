import { Timestamp } from 'firebase/firestore';
import { SplitType, SplitEntry } from '@/types/expense';

export const ROOM_EXPENSE_CATEGORIES = [
  'Rent',
  'Groceries',
  'Electricity',
  'Water',
  'WiFi',
  'Maid',
  'Maintenance',
  'Repair',
  'Household',
  'Miscellaneous',
] as const;

export type RoomExpenseCategory = (typeof ROOM_EXPENSE_CATEGORIES)[number] | (string & {});

export interface RoomExpense {
  id: string;
  roomId: string;
  cycleId: string;
  title: string;
  amount: number;
  category: RoomExpenseCategory;
  expenseDate: Timestamp;
  expenseTime?: string;
  note: string;
  receiptURL: string;
  paidBy: string;
  splitType: SplitType;
  splitBetween: SplitEntry[];
  createdBy: string;
  createdAt: Timestamp;
}
