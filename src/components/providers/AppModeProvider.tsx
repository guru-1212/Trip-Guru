'use client';

import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/store';
import { setAppModeState, resetAppMode } from '@/features/appMode/appModeSlice';
import { fetchUserTrips } from '@/features/trips/tripsThunks';
import { fetchUserRooms } from '@/features/rooms/roomsThunks';
import {
  resolveAppMode,
  canSwitchWorkspace,
  writeStoredMode,
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

    const mode = resolveAppMode(uid, user.primaryUseCase, user.activeMode);
    const canSwitch = canSwitchWorkspace(user.primaryUseCase, {
      hasTrips: trips.length > 0,
      hasRooms: rooms.length > 0,
    });

    writeStoredMode(uid, mode);
    dispatch(setAppModeState({ mode, canSwitch }));
  }, [uid, user, user?.primaryUseCase, user?.activeMode, trips.length, rooms.length, dispatch]);

  return <>{children}</>;
}
