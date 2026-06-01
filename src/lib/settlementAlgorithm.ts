import { Expense } from '@/types/expense';
import { TripMember } from '@/types/member';
import { Settlement } from '@/types/settlement';
import { CarryForwardBalance } from '@/types/roomSettlement';
import { getMemberKey, resolveMemberKey } from '@/lib/utils';

export interface SplittableExpense {
  amount: number;
  expenseType?: 'planned' | 'actual';
  paidBy?: string;
  splitBetween?: { uid: string; amount: number }[];
}

export interface MemberLike {
  id: string;
  userId?: string | null;
  inviteStatus?: 'accepted' | 'pending';
}

function activeMembers<T extends MemberLike>(members: T[]): T[] {
  return members.filter((m) => m.inviteStatus !== 'pending');
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
  const participants = activeMembers(members);
  const activeKeys = new Set(participants.map(getMemberKey));

  activeKeys.forEach((key) => {
    balances.set(key, 0);
  });

  expenses.forEach((expense) => {
    const type = expense.expenseType || 'actual';
    if (type !== 'actual') return;

    const payerKey =
      resolveMemberKey(expense.paidBy ?? '', members) ?? expense.paidBy ?? '';

    if (activeKeys.has(payerKey)) {
      balances.set(payerKey, (balances.get(payerKey) ?? 0) + expense.amount);
    }

    expense.splitBetween?.forEach((split) => {
      const splitKey = resolveMemberKey(split.uid, members) ?? split.uid;
      if (activeKeys.has(splitKey)) {
        balances.set(splitKey, (balances.get(splitKey) ?? 0) - split.amount);
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

export interface MemberSpendTotal {
  memberKey: string;
  amount: number;
}

/** Sum each member's share from expense splits (current cycle expenses). */
export function getMemberSpendTotals<T extends MemberLike>(
  expenses: SplittableExpense[],
  members: T[]
): MemberSpendTotal[] {
  const totals = new Map<string, number>();
  const participants = activeMembers(members);
  const activeKeys = new Set(participants.map(getMemberKey));
  activeKeys.forEach((key) => totals.set(key, 0));

  expenses.forEach((expense) => {
    if ((expense.expenseType || 'actual') !== 'actual') return;
    expense.splitBetween?.forEach((split) => {
      const splitKey = resolveMemberKey(split.uid, members) ?? split.uid;
      if (activeKeys.has(splitKey)) {
        totals.set(splitKey, (totals.get(splitKey) ?? 0) + split.amount);
      }
    });
  });

  return participants
    .map((m) => ({
      memberKey: getMemberKey(m),
      amount: Math.round((totals.get(getMemberKey(m)) ?? 0) * 100) / 100,
    }))
    .sort((a, b) => b.amount - a.amount);
}

/** Sum each member's out-of-pocket payments (paidBy) for the cycle. */
export function getMemberPaidTotals<T extends MemberLike>(
  expenses: SplittableExpense[],
  members: T[]
): MemberSpendTotal[] {
  const totals = new Map<string, number>();
  const participants = activeMembers(members);
  const activeKeys = new Set(participants.map(getMemberKey));
  activeKeys.forEach((key) => totals.set(key, 0));

  expenses.forEach((expense) => {
    if ((expense.expenseType || 'actual') !== 'actual') return;
    const payerKey =
      resolveMemberKey(expense.paidBy ?? '', members) ?? expense.paidBy ?? '';
    if (activeKeys.has(payerKey)) {
      totals.set(payerKey, (totals.get(payerKey) ?? 0) + expense.amount);
    }
  });

  return participants
    .map((m) => ({
      memberKey: getMemberKey(m),
      amount: Math.round((totals.get(getMemberKey(m)) ?? 0) * 100) / 100,
    }))
    .sort((a, b) => b.amount - a.amount);
}
