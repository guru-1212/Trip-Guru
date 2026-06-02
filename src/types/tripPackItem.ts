import { Timestamp } from 'firebase/firestore';

export const TRIP_PACK_CATEGORIES = [
  'Clothing',
  'Electronics',
  'Health',
  'Documents',
  'Food',
  'Toiletries',
  'Miscellaneous',
] as const;

export type TripPackCategory =
  | (typeof TRIP_PACK_CATEGORIES)[number]
  | (string & {});

export type TripPackItemType = 'buy' | 'bring';
export type TripPackStatus = 'todo' | 'ready' | 'packed';
export type TripPackSource = 'custom' | 'template';

export interface TripPackItem {
  id: string;
  tripId: string;
  title: string;
  category: TripPackCategory;
  itemType: TripPackItemType;
  status: TripPackStatus;
  quantity: string;
  note: string;
  assignedToMemberKey: string | null;
  source: TripPackSource;
  templateKey: string | null;
  templateItemSlug: string | null;
  createdBy: string;
  createdAt: Timestamp;
  packedAt: Timestamp | null;
}
