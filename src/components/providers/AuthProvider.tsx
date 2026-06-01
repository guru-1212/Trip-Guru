'use client';

import { useEffect } from 'react';
import { useAppDispatch } from '@/store';
import { listenAuth } from '@/features/auth/authThunks';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const unsub = listenAuth(dispatch);
    return () => unsub();
  }, [dispatch]);

  return <>{children}</>;
}
