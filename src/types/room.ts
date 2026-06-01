import { Timestamp } from 'firebase/firestore';

export interface Room {
  roomId: string;
  name: string;
  createdBy: string;
  currency: string;
  status: 'active';
  membersCount: number;
  createdAt: Timestamp;
}
