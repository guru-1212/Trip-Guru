import { PrimaryUseCase } from '@/types/user';

export type AppMode = 'trip' | 'room';

const STORAGE_PREFIX = 'tripmate_app_mode_';

export function storageKey(uid: string): string {
  return `${STORAGE_PREFIX}${uid}`;
}

export function readStoredMode(uid: string): AppMode | null {
  if (typeof window === 'undefined') return null;
  const value = localStorage.getItem(storageKey(uid));
  if (value === 'trip' || value === 'room') return value;
  return null;
}

export function writeStoredMode(uid: string, mode: AppMode): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(storageKey(uid), mode);
}

/** Default workspace when no saved preference exists. */
export function defaultModeForUseCase(
  primaryUseCase?: PrimaryUseCase
): AppMode {
  if (primaryUseCase === 'roommate') return 'room';
  return 'trip';
}

/** Show Trip ↔ Room switcher in the shell. */
export function canSwitchWorkspace(
  primaryUseCase?: PrimaryUseCase,
  options?: { hasTrips?: boolean; hasRooms?: boolean }
): boolean {
  if (primaryUseCase === 'both') return true;
  if (primaryUseCase === 'trips' || primaryUseCase === 'roommate') {
    return false;
  }
  // Legacy accounts (no primaryUseCase): enable switch if they use both features
  return Boolean(options?.hasTrips && options?.hasRooms);
}

export function resolveAppMode(
  uid: string,
  primaryUseCase?: PrimaryUseCase,
  firestoreMode?: AppMode
): AppMode {
  if (primaryUseCase === 'trips') return 'trip';
  if (primaryUseCase === 'roommate') return 'room';

  if (firestoreMode === 'trip' || firestoreMode === 'room') {
    return firestoreMode;
  }

  const stored = readStoredMode(uid);
  if (stored) return stored;

  return defaultModeForUseCase(primaryUseCase);
}
