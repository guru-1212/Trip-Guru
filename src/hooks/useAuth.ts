'use client';

import { useEffect } from 'react';
import { useAppSelector } from '@/store';
import { requestFCMToken } from '@/services/fcmService';

export function useAuth() {
  const { user, firebaseUid, loading, error, initialized } = useAppSelector(
    (s) => s.auth
  );

  useEffect(() => {
    if (
      firebaseUid &&
      user?.notifyEnabled !== false &&
      typeof Notification !== 'undefined' &&
      Notification.permission === 'granted'
    ) {
      requestFCMToken(firebaseUid).catch((err) =>
        console.warn('FCM background registration failed:', err)
      );
    }
  }, [firebaseUid, user?.notifyEnabled]);

  return {
    user,
    uid: firebaseUid,
    loading,
    error,
    initialized,
    isAuthenticated: !!firebaseUid,
  };
}
