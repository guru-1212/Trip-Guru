import type { TripPackItem, TripPackItemType } from '@/types/tripPackItem';

export interface TripPackProgressStats {
  total: number;
  packed: number;
  overallPercent: number;
  buyTotal: number;
  buyPacked: number;
  buyPercent: number;
  bringTotal: number;
  bringPacked: number;
  bringPercent: number;
  remaining: number;
}

export function computeTripPackProgress(
  items: TripPackItem[]
): TripPackProgressStats {
  const total = items.length;
  const packed = items.filter((i) => i.status === 'packed').length;
  const buyItems = items.filter((i) => i.itemType === 'buy');
  const bringItems = items.filter((i) => i.itemType === 'bring');
  const buyPacked = buyItems.filter((i) => i.status === 'packed').length;
  const bringPacked = bringItems.filter((i) => i.status === 'packed').length;

  const pct = (num: number, den: number) =>
    den === 0 ? 0 : Math.round((num / den) * 100);

  return {
    total,
    packed,
    overallPercent: pct(packed, total),
    buyTotal: buyItems.length,
    buyPacked,
    buyPercent: pct(buyPacked, buyItems.length),
    bringTotal: bringItems.length,
    bringPacked,
    bringPercent: pct(bringPacked, bringItems.length),
    remaining: total - packed,
  };
}

export function computeMemberPackProgress(
  items: TripPackItem[],
  memberKey: string
): { assigned: number; packed: number; percent: number } {
  const assigned = items.filter((i) => i.assignedToMemberKey === memberKey);
  const packed = assigned.filter((i) => i.status === 'packed').length;
  return {
    assigned: assigned.length,
    packed,
    percent:
      assigned.length === 0
        ? 0
        : Math.round((packed / assigned.length) * 100),
  };
}

export function isItemPacked(item: TripPackItem): boolean {
  return item.status === 'packed';
}

export function nextPackStatus(
  item: Pick<TripPackItem, 'itemType' | 'status'>
): TripPackItem['status'] | null {
  if (item.status === 'packed') return null;
  if (item.itemType === 'bring') return 'packed';
  if (item.status === 'todo') return 'ready';
  return 'packed';
}

export function prevPackStatus(
  item: Pick<TripPackItem, 'itemType' | 'status'>
): TripPackItem['status'] | null {
  if (item.status === 'todo') return null;
  if (item.status === 'packed' && item.itemType === 'bring') return 'todo';
  if (item.status === 'packed') return 'ready';
  return 'todo';
}

export function statusLabel(
  item: Pick<TripPackItem, 'itemType' | 'status'>
): string {
  if (item.status === 'packed') return 'Packed';
  if (item.itemType === 'bring') return 'Not packed yet';
  if (item.status === 'ready') return 'Bought — pack it';
  return 'Need to buy';
}

export function filterByType(
  items: TripPackItem[],
  itemType: TripPackItemType
): TripPackItem[] {
  return items.filter((i) => i.itemType === itemType);
}
