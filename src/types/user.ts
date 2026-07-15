import { Timestamp } from 'firebase/firestore';

export type PrimaryUseCase = 'trips' | 'roommate' | 'both';

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
  primaryUseCase?: PrimaryUseCase;
  /** Active Trip vs Room UI mode (for "both" and legacy multi-use accounts). */
  activeMode?: AppMode;
  /**
   * Workspaces this user has chosen to see in the app (Trips/Rooms/GYM/YOGA).
   * Personal preference only — affects this account's UI, never other users.
   * Undefined or empty means "all enabled" (backward compatible for existing accounts).
   */
  enabledWorkspaces?: AppMode[];
  /** When set, FitTrack reads/writes use this owner's data instead of own uid. */
  fittrackLinkedOwnerId?: string;
  googleCalendarLinked?: boolean;
  googleCalendarId?: string;
  /** Temporary access token stored in memory/session for calendar operations */
  googleAccessToken?: string;
}
