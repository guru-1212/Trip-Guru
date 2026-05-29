'use client';

import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { onForegroundMessage } from '@/services/fcmService';

export function FCMProvider({ children }: { children: React.ReactNode }) {
  const { uid } = useAuth();

  useEffect(() => {
    if (!uid) return;

    let unsubscribe: (() => void) | null = null;

    onForegroundMessage((payload) => {
      const data = payload as {
        notification?: { title?: string; body?: string };
      };
      if (
        typeof window !== 'undefined' &&
        'Notification' in window &&
        Notification.permission === 'granted' &&
        data.notification
      ) {
        new Notification(data.notification.title ?? 'TripMate', {
          body: data.notification.body,
          icon: '/icons/icon-192x192.png',
        });
      }
    }).then((unsub) => {
      unsubscribe = unsub;
    });

    return () => {
      unsubscribe?.();
    };
  }, [uid]);

  return <>{children}</>;
}
