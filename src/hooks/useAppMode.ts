'use client';

import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '@/store';
import { setAppMode } from '@/features/appMode/appModeSlice';
import {
  AppMode,
  writeStoredMode,
  canSwitchWorkspace,
} from '@/lib/appMode';
import { updateUser } from '@/firebase/firestore';
import { updateProfileLocal } from '@/features/auth/authSlice';

export function useAppMode() {
  const dispatch = useAppDispatch();
  const mode = useAppSelector((s) => s.appMode.mode);
  const canSwitch = useAppSelector((s) => s.appMode.canSwitch);
  const initialized = useAppSelector((s) => s.appMode.initialized);
  const uid = useAppSelector((s) => s.auth.firebaseUid);
  const user = useAppSelector((s) => s.auth.user);

  const switchMode = useCallback(
    async (next: AppMode) => {
      if (!canSwitch || next === mode) return;
      dispatch(setAppMode(next));
      if (uid) {
        writeStoredMode(uid, next);
        try {
          await updateUser(uid, { activeMode: next });
          dispatch(updateProfileLocal({ activeMode: next }));
        } catch {
          // Local mode still applies
        }
      }
    },
    [canSwitch, mode, uid, dispatch]
  );

  const isTripMode = mode === 'trip';
  const isRoomMode = mode === 'room';

  return {
    mode,
    canSwitch,
    initialized,
    switchMode,
    isTripMode,
    isRoomMode,
    primaryUseCase: user?.primaryUseCase,
  };
}

export function useCanSwitchWithCounts(hasTrips: boolean, hasRooms: boolean) {
  const user = useAppSelector((s) => s.auth.user);
  return canSwitchWorkspace(user?.primaryUseCase, { hasTrips, hasRooms });
}
