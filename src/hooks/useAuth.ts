'use client';

import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/store';
import { listenAuth } from '@/features/auth/authThunks';
import { requestFCMToken } from '@/services/fcmService';

export function useAuth() {
  const dispatch = useAppDispatch();
  const { user, firebaseUid, loading, error, initialized } = useAppSelector(
    (s) => s.auth
  );

  useEffect(() => {
    const unsub = listenAuth(dispatch);
    return () => unsub();
  }, [dispatch]);

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
