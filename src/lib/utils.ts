import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = 'INR'): string {
  try {
    const validCurrency = currency.length === 3 ? currency.toUpperCase() : 'INR';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: validCurrency,
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
    }).format(amount);
  } catch (e) {
    // Fallback for invalid currency codes
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export function getMemberKey(member: { id: string }): string {
  return member.id;
}

/** Map expense/settlement keys (member id or legacy auth uid) to the current member doc id. */
export function resolveMemberKey(
  key: string,
  members: { id: string; userId?: string | null }[]
): string | null {
  if (!key) return null;
  if (members.some((m) => m.id === key)) return key;
  const byUserId = members.find((m) => m.userId === key);
  if (byUserId) return byUserId.id;
  return null;
}

export function getMyMemberKey(
  authUid: string | undefined | null,
  members: { id: string; userId?: string | null }[]
): string | undefined {
  if (!authUid) return undefined;
  return members.find((m) => m.userId === authUid)?.id;
}

export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '').replace(/^91/, '').slice(-10);
}
