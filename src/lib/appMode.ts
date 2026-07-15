import { PrimaryUseCase } from '@/types/user';

export type AppMode = 'trip' | 'room' | 'gym' | 'yoga';

/** Every workspace the app ships with, in display order. */
export const ALL_WORKSPACES: AppMode[] = ['trip', 'room', 'gym', 'yoga'];

const STORAGE_PREFIX = 'tripmate_app_mode_';

/**
 * The workspaces a user has chosen to see, normalized to display order.
 * Undefined/empty (existing accounts) or an all-disabled list falls back to
 * every workspace, so a user can never lock themselves out of the whole app.
 */
export function resolveEnabledWorkspaces(enabled?: AppMode[] | null): AppMode[] {
  if (!enabled || enabled.length === 0) return [...ALL_WORKSPACES];
  const set = new Set(enabled);
  const filtered = ALL_WORKSPACES.filter((w) => set.has(w));
  return filtered.length > 0 ? filtered : [...ALL_WORKSPACES];
}

/** Whether a given workspace is visible for this user's preferences. */
export function isWorkspaceEnabled(
  mode: AppMode,
  enabled?: AppMode[] | null
): boolean {
  return resolveEnabledWorkspaces(enabled).includes(mode);
}

/** Snap a resolved mode to one the user still has enabled (first enabled otherwise). */
export function clampModeToEnabled(
  mode: AppMode,
  enabled?: AppMode[] | null
): AppMode {
  const list = resolveEnabledWorkspaces(enabled);
  return list.includes(mode) ? mode : list[0];
}

export function storageKey(uid: string): string {
  return `${STORAGE_PREFIX}${uid}`;
}

export function readStoredMode(uid: string): AppMode | null {
  if (typeof window === 'undefined') return null;
  const value = localStorage.getItem(storageKey(uid));
  if (value === 'trip' || value === 'room' || value === 'gym' || value === 'yoga') return value;
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

/** Show Trip ↔ Room ↔ GYM ↔ YOGA switcher in the shell. */
export function canSwitchWorkspace(
  primaryUseCase?: PrimaryUseCase,
  options?: { hasTrips?: boolean; hasRooms?: boolean }
): boolean {
  // Always allow switching to GYM/YOGA mode since it's a personal tool
  return true;
}

export function resolveAppMode(
  uid: string,
  primaryUseCase?: PrimaryUseCase,
  firestoreMode?: AppMode
): AppMode {
  if (firestoreMode === 'trip' || firestoreMode === 'room' || firestoreMode === 'gym' || firestoreMode === 'yoga') {
    return firestoreMode;
  }

  const stored = readStoredMode(uid);
  if (stored) return stored;

  if (primaryUseCase === 'trips') return 'trip';
  if (primaryUseCase === 'roommate') return 'room';

  return defaultModeForUseCase(primaryUseCase);
}
