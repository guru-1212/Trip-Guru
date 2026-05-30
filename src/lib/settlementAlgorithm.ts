import { Expense } from '@/types/expense';
import { TripMember } from '@/types/member';
import { Settlement } from '@/types/settlement';
import { getMemberKey } from '@/lib/utils';

interface BalanceEntry {
  uid: string;
  balance: number;
}

export function calculateNetBalances(
  expenses: Expense[],
  members: TripMember[]
): Map<string, number> {
  const balances = new Map<string, number>();
  const activeKeys = new Set(members.map(getMemberKey));

  // 1. Initialize balances for all active members
  activeKeys.forEach((key) => {
    balances.set(key, 0);
  });

  // 2. Process each expense against the balances
  expenses.forEach((expense) => {
    const payerKey = expense.paidBy ?? '';

    // A. Credit the person who paid
    if (activeKeys.has(payerKey)) {
      balances.set(payerKey, (balances.get(payerKey) ?? 0) + expense.amount);
    }

    // B. Debit the people who were part of the split
    expense.splitBetween?.forEach((split) => {
      if (activeKeys.has(split.uid)) {
        balances.set(split.uid, (balances.get(split.uid) ?? 0) - split.amount);
      }
    });
  });

  return balances;
}

export function computeSettlements(
  expenses: Expense[],
  members: TripMember[],
  tripId: string
): Settlement[] {
  const balances = calculateNetBalances(expenses, members);

  const creditors: BalanceEntry[] = [];
  const debtors: BalanceEntry[] = [];

  balances.forEach((balance, uid) => {
    if (balance > 0.01) {
      creditors.push({ uid, balance });
    } else if (balance < -0.01) {
      debtors.push({ uid, balance: Math.abs(balance) });
    }
  });

  creditors.sort((a, b) => b.balance - a.balance);
  debtors.sort((a, b) => b.balance - a.balance);

  const settlements: Settlement[] = [];
  let settlementIndex = 0;

  let ci = 0;
  let di = 0;

  while (ci < creditors.length && di < debtors.length) {
    const creditor = creditors[ci];
    const debtor = debtors[di];
    const amount = Math.min(creditor.balance, debtor.balance);

    if (amount > 0.01) {
      settlements.push({
        id: `computed_${tripId}_${settlementIndex++}`,
        tripId,
        fromUid: debtor.uid,
        toUid: creditor.uid,
        amount: Math.round(amount * 100) / 100,
        status: 'pending',
        paidAt: null,
      });
    }

    creditor.balance -= amount;
    debtor.balance -= amount;

    // Force move to next index if balance is effectively zero
    if (creditor.balance < 0.01) ci++;
    if (debtor.balance < 0.01) di++;
    
    // Safety break: if we are stuck on the same person but balance won't drop
    if (ci >= creditors.length || di >= debtors.length) break;
  }

  return settlements;
}

export function getTotalSpent(expenses: Expense[]): number {
  return expenses.reduce((sum, e) => sum + e.amount, 0);
}
