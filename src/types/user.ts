import { Timestamp } from 'firebase/firestore';

export type PrimaryUseCase = 'trips' | 'roommate' | 'both';

export type AppMode = 'trip' | 'room' | 'gym';

export interface User {
  uid: string;
  name: string;
  email: string;
  phone: string;
  photoURL: string;
  fcmToken: string;
  /** All devices/browsers that opted in to push (deduped server-side). */
  fcmTokens?: string[];
  createdAt: Timestamp;
  notifyEnabled?: boolean;
  primaryUseCase?: PrimaryUseCase;
  /** Active Trip vs Room UI mode (for "both" and legacy multi-use accounts). */
  activeMode?: AppMode;
}
