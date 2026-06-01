'use client';

import { useEffect } from 'react';
import { useAppSelector } from '@/store';
import { requestFCMToken } from '@/services/fcmService';

export function useAuth() {
  const { user, firebaseUid, loading, error, initialized } = useAppSelector(
    (s) => s.auth
  );

  useEffect(() => {
    if (firebaseUid) {
      requestFCMToken(firebaseUid);
    }
  }, [firebaseUid]);

  return {
    user,
    uid: firebaseUid,
    loading,
    error,
    initialized,
    isAuthenticated: !!firebaseUid,
  };
}
