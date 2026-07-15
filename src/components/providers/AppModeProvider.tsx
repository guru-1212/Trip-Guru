'use client';

import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/store';
import { setAppModeState, resetAppMode } from '@/features/appMode/appModeSlice';
import { fetchUserTrips } from '@/features/trips/tripsThunks';
import { fetchUserRooms } from '@/features/rooms/roomsThunks';
import {
  resolveAppMode,
  writeStoredMode,
  resolveEnabledWorkspaces,
  clampModeToEnabled,
} from '@/lib/appMode';

export function AppModeProvider({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  const uid = useAppSelector((s) => s.auth.firebaseUid);
  const user = useAppSelector((s) => s.auth.user);
  const trips = useAppSelector((s) => s.trips.trips);
  const rooms = useAppSelector((s) => s.rooms.rooms);

  useEffect(() => {
    if (uid) {
      dispatch(fetchUserTrips(uid));
      dispatch(fetchUserRooms(uid));
    }
  }, [uid, dispatch]);

  useEffect(() => {
    if (!uid || !user) {
      dispatch(resetAppMode());
      return;
    }

    // Honor the user's per-account workspace visibility. A resolved mode that
    // points at a workspace they've hidden is snapped back to an enabled one,
    // and the switcher is only offered when more than one workspace is visible.
    const enabled = resolveEnabledWorkspaces(user.enabledWorkspaces);
    const mode = clampModeToEnabled(
      resolveAppMode(uid, user.primaryUseCase, user.activeMode),
      user.enabledWorkspaces
    );
    const canSwitch = enabled.length > 1;

    writeStoredMode(uid, mode);
    dispatch(setAppModeState({ mode, canSwitch }));
  }, [uid, user, user?.primaryUseCase, user?.activeMode, user?.enabledWorkspaces, trips.length, rooms.length, dispatch]);

  return <>{children}</>;
}
