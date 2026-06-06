'use client';

import { useEffect, useState } from 'react';
import { useAppDispatch } from '@/store';
import { listenAuth } from '@/features/auth/authThunks';
import { ensureFirebaseConfig } from '@/firebase/config';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  const [ready, setReady] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);

  useEffect(() => {
    ensureFirebaseConfig()
      .then(() => setReady(true))
      .catch((error: unknown) => {
        const message =
          error instanceof Error ? error.message : 'Firebase configuration failed.';
        setConfigError(message);
        console.error(message);
      });
  }, []);

  useEffect(() => {
    if (!ready) return;
    const unsub = listenAuth(dispatch);
    return () => unsub();
  }, [dispatch, ready]);

  if (configError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <div className="max-w-md text-center space-y-3">
          <p className="text-lg font-bold text-destructive">Firebase setup error</p>
          <p className="text-sm text-muted-foreground">{configError}</p>
        </div>
      </div>
    );
  }

  if (!ready) {
    return null;
  }

  return <>{children}</>;
}
