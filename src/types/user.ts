import { Timestamp } from 'firebase/firestore';

/** @deprecated Legacy multi-product field; still present on old user docs, never read or written now. */
export type PrimaryUseCase = 'trips' | 'roommate' | 'both';

/** @deprecated Legacy multi-product field; still present on old user docs, never read or written now. */
export type AppMode = 'trip' | 'room' | 'gym' | 'yoga';

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
  /** @deprecated Legacy field from the multi-product era; ignored. */
  primaryUseCase?: PrimaryUseCase;
  /** @deprecated Legacy field from the multi-product era; ignored. */
  activeMode?: AppMode;
  /** @deprecated Legacy field from the multi-product era; ignored. */
  enabledWorkspaces?: AppMode[];
  /** When set, FitTrack reads/writes use this owner's data instead of own uid. */
  fittrackLinkedOwnerId?: string;
  googleCalendarLinked?: boolean;
  googleCalendarId?: string;
  /** Temporary access token stored in memory/session for calendar operations */
  googleAccessToken?: string;
}
