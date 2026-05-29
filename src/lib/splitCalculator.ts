import { SplitEntry, SplitType } from '@/types/expense';

export class SplitValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SplitValidationError';
  }
}

export function calculateEqualSplit(
  total: number,
  memberUids: string[]
): SplitEntry[] {
  if (memberUids.length === 0) {
    throw new SplitValidationError('At least one member required for equal split');
  }

  const base = Math.floor((total * 100) / memberUids.length) / 100;
  let remainder = Math.round(total * 100) - base * 100 * memberUids.length;
  remainder = Math.round(remainder);

  return memberUids.map((uid, index) => {
    let amount = base;
    if (index === memberUids.length - 1) {
      amount = Math.round((total - base * (memberUids.length - 1)) * 100) / 100;
    } else if (remainder > 0) {
      amount = Math.round((base + 0.01) * 100) / 100;
      remainder -= 1;
    }
    return { uid, amount };
  });
}

export function calculateUnequalSplit(
  total: number,
  entries: SplitEntry[]
): SplitEntry[] {
  const sum = entries.reduce((s, e) => s + e.amount, 0);
  if (Math.abs(sum - total) > 0.01) {
    throw new SplitValidationError(
      `Split amounts (${sum}) must equal expense total (${total})`
    );
  }
  return entries.map((e) => ({
    uid: e.uid,
    amount: Math.round(e.amount * 100) / 100,
  }));
}

export function calculatePercentSplit(
  total: number,
  percents: { uid: string; percent: number }[]
): SplitEntry[] {
  const sumPercent = percents.reduce((s, p) => s + p.percent, 0);
  if (Math.abs(sumPercent - 100) > 0.01) {
    throw new SplitValidationError('Percentages must sum to 100');
  }

  const splits: SplitEntry[] = percents.map((p) => ({
    uid: p.uid,
    amount: Math.round((p.percent / 100) * total * 100) / 100,
  }));

  const splitSum = splits.reduce((s, e) => s + e.amount, 0);
  const diff = Math.round((total - splitSum) * 100) / 100;
  if (diff !== 0 && splits.length > 0) {
    splits[splits.length - 1].amount =
      Math.round((splits[splits.length - 1].amount + diff) * 100) / 100;
  }

  return splits;
}

export function calculateSingleSplit(
  total: number,
  payerUid: string,
  debtorUid: string
): SplitEntry[] {
  if (payerUid === debtorUid) {
    return [{ uid: debtorUid, amount: 0 }];
  }
  return [{ uid: debtorUid, amount: total }];
}

export function calculateSplit(
  splitType: SplitType,
  total: number,
  options: {
    memberUids?: string[];
    unequalEntries?: SplitEntry[];
    percentEntries?: { uid: string; percent: number }[];
    payerUid?: string;
    singleDebtorUid?: string;
  }
): SplitEntry[] {
  switch (splitType) {
    case 'equal':
      return calculateEqualSplit(total, options.memberUids ?? []);
    case 'unequal':
      return calculateUnequalSplit(total, options.unequalEntries ?? []);
    case 'percent':
      return calculatePercentSplit(total, options.percentEntries ?? []);
    case 'single':
      return calculateSingleSplit(
        total,
        options.payerUid ?? '',
        options.singleDebtorUid ?? ''
      );
    default:
      throw new SplitValidationError(`Unknown split type: ${splitType}`);
  }
}
