import { Timestamp } from 'firebase/firestore';

export const DEFAULT_EXPENSE_CATEGORIES = [
  'Food',
  'Hotel',
  'Petrol',
  'Toll',
  'Shopping',
  'Ticket',
  'Emergency',
  'Misc',
] as const;

export type DefaultExpenseCategory = (typeof DEFAULT_EXPENSE_CATEGORIES)[number];
export type ExpenseCategory = DefaultExpenseCategory | (string & {});

export type SplitType = 'equal' | 'unequal' | 'percent' | 'single';

export interface SplitEntry {
  uid: string;
  amount: number;
}

export type ExpenseType = 'planned' | 'actual';
// kk

export interface Expense {
  id: string;
  tripId: string;
  amount: number;
  category: ExpenseCategory;
  expenseType: ExpenseType;
  paidBy?: string;
  splitType?: SplitType;
  splitBetween?: SplitEntry[];
  receiptURL: string;
  note: string;
  createdBy: string;
  createdAt: Timestamp;
}
