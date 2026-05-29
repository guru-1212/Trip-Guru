import { Timestamp } from 'firebase/firestore';

export type MemoryType = 'photo' | 'video' | 'note' | 'voice';

export interface Memory {
  id: string;
  tripId: string;
  uploadedBy: string;
  type: MemoryType;
  fileURL: string;
  caption: string;
  createdAt: Timestamp;
}
