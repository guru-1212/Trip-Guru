import { Timestamp } from 'firebase/firestore';

export const ROOM_BRING_CATEGORIES = [
  'Groceries',
  'Kitchen',
  'Bathroom',
  'Cleaning',
  'Furniture',
  'Appliances',
  'Stationery',
  'Miscellaneous',
] as const;

export type RoomBringCategory =
  | (typeof ROOM_BRING_CATEGORIES)[number]
  | (string & {});

export type RoomBringStatus = 'planned' | 'brought';

export interface RoomBringItem {
  id: string;
  roomId: string;
  cycleId: string;
  title: string;
  category: RoomBringCategory;
  estimatedAmount: number;
  quantity: string;
  note: string;
  assignedToMemberKey: string | null;
  status: RoomBringStatus;
  broughtAt: Timestamp | null;
  createdBy: string;
  createdAt: Timestamp;
}
