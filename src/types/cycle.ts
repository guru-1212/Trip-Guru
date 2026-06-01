import { Timestamp } from 'firebase/firestore';

export type CycleStatus = 'active' | 'closed' | 'archived';

export interface Cycle {
  id: string;
  roomId: string;
  month: number;
  year: number;
  status: CycleStatus;
  createdAt: Timestamp;
}
