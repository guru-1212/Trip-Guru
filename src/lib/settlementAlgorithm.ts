import { Expense } from '@/types/expense';
import { TripMember } from '@/types/member';
import { Settlement } from '@/types/settlement';
import { CarryForwardBalance } from '@/types/roomSettlement';
import { getMemberKey } from '@/lib/utils';

export interface SplittableExpense {
  amount: number;
  expenseType?: 'planned' | 'actual';
  paidBy?: string;
  splitBetween?: { uid: string; amount: number }[];
}

export interface MemberLike {
  id: string;
  userId?: string | null;
}

interface BalanceEntry {
  uid: string;
  balance: number;
}

export function calculateNetBalances<T extends MemberLike>(
  expenses: SplittableExpense[],
  members: T[]
): Map<string, number> {
  const balances = new Map<string, number>();
  const activeKeys = new Set(members.map(getMemberKey));

  activeKeys.forEach((key) => {
    balances.set(key, 0);
  });

  expenses.forEach((expense) => {
    const type = expense.expenseType || 'actual';
    if (type !== 'actual') return;

    const payerKey = expense.paidBy ?? '';

    if (activeKeys.has(payerKey)) {
      balances.set(payerKey, (balances.get(payerKey) ?? 0) + expense.amount);
    }

    expense.splitBetween?.forEach((split) => {
      if (activeKeys.has(split.uid)) {
        balances.set(split.uid, (balances.get(split.uid) ?? 0) - split.amount);
      }
    });
  });

  return balances;
}

export function applyCarryForwardToBalances(
  balances: Map<string, number>,
  carryForward: Pick<CarryForwardBalance, 'fromMemberKey' | 'toMemberKey' | 'amount' | 'status'>[]
): Map<string, number> {
  const result = new Map(balances);

  carryForward.forEach((cf) => {
    if (cf.status === 'settled' || cf.amount < 0.01) return;
    const debtor = cf.fromMemberKey;
    const creditor = cf.toMemberKey;
    result.set(debtor, (result.get(debtor) ?? 0) - cf.amount);
    result.set(creditor, (result.get(creditor) ?? 0) + cf.amount);
  });

  return result;
}

function computeSettlementsFromBalances(
  balances: Map<string, number>,
  contextId: string,
  mapSettlement: (fromUid: string, toUid: string, amount: number, index: number) => Settlement
): Settlement[] {
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
      settlements.push(
        mapSettlement(debtor.uid, creditor.uid, Math.round(amount * 100) / 100, settlementIndex++)
      );
    }

    creditor.balance -= amount;
    debtor.balance -= amount;

    if (creditor.balance < 0.01) ci++;
    if (debtor.balance < 0.01) di++;
    if (ci >= creditors.length || di >= debtors.length) break;
  }

  return settlements;
}

export function computeSettlements(
  expenses: Expense[],
  members: TripMember[],
  tripId: string
): Settlement[] {
  const balances = calculateNetBalances(expenses, members);
  return computeSettlementsFromBalances(balances, tripId, (fromUid, toUid, amount, index) => ({
    id: `computed_${tripId}_${index}`,
    tripId,
    fromUid,
    toUid,
    amount,
    status: 'pending',
    paidAt: null,
  }));
}

export interface RoomComputedSettlement {
  id: string;
  roomId: string;
  fromMemberKey: string;
  toMemberKey: string;
  amount: number;
  status: 'pending';
}

export function computeRoomSettlements(
  expenses: SplittableExpense[],
  members: MemberLike[],
  roomId: string,
  carryForward: Pick<CarryForwardBalance, 'fromMemberKey' | 'toMemberKey' | 'amount' | 'status'>[] = []
): RoomComputedSettlement[] {
  const base = calculateNetBalances(expenses, members);
  const balances = applyCarryForwardToBalances(base, carryForward);

  const creditors: BalanceEntry[] = [];
  const debtors: BalanceEntry[] = [];

  balances.forEach((balance, uid) => {
    if (balance > 0.01) creditors.push({ uid, balance });
    else if (balance < -0.01) debtors.push({ uid, balance: Math.abs(balance) });
  });

  creditors.sort((a, b) => b.balance - a.balance);
  debtors.sort((a, b) => b.balance - a.balance);

  const settlements: RoomComputedSettlement[] = [];
  let index = 0;
  let ci = 0;
  let di = 0;

  while (ci < creditors.length && di < debtors.length) {
    const creditor = creditors[ci];
    const debtor = debtors[di];
    const amount = Math.min(creditor.balance, debtor.balance);

    if (amount > 0.01) {
      settlements.push({
        id: `computed_${roomId}_${index++}`,
        roomId,
        fromMemberKey: debtor.uid,
        toMemberKey: creditor.uid,
        amount: Math.round(amount * 100) / 100,
        status: 'pending',
      });
    }

    creditor.balance -= amount;
    debtor.balance -= amount;
    if (creditor.balance < 0.01) ci++;
    if (debtor.balance < 0.01) di++;
    if (ci >= creditors.length || di >= debtors.length) break;
  }

  return settlements;
}

export function getTotalSpent(expenses: SplittableExpense[]): number {
  return expenses
    .filter((e) => (e.expenseType || 'actual') === 'actual')
    .reduce((sum, e) => sum + e.amount, 0);
}
