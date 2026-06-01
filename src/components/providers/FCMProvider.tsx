'use client';

import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  onForegroundMessage,
  openNotificationTarget,
  requestFCMToken,
} from '@/services/fcmService';

function getPayloadUrl(payload: unknown): string | null {
  const p = payload as {
    data?: { url?: string; roomId?: string; tripId?: string; path?: string };
    notification?: { title?: string; body?: string };
  };
  if (p.data?.url) return p.data.url;
  if (p.data?.roomId) {
    return `/rooms/${p.data.roomId}${p.data.path ?? ''}`;
  }
  if (p.data?.tripId) {
    return `/trips/${p.data.tripId}${p.data.path ?? '/expenses'}`;
  }
  return null;
}

export function FCMProvider({ children }: { children: React.ReactNode }) {
  const { uid, user } = useAuth();

  useEffect(() => {
    if (!uid) return;
    if (user?.notifyEnabled !== false) {
      requestFCMToken(uid);
    }
  }, [uid, user?.notifyEnabled]);

  useEffect(() => {
    if (!uid) return;

    let unsubscribe: (() => void) | null = null;

    onForegroundMessage((payload) => {
      const data = payload as {
        notification?: { title?: string; body?: string };
      };
      const targetUrl = getPayloadUrl(payload);

      if (
        typeof window !== 'undefined' &&
        'Notification' in window &&
        Notification.permission === 'granted' &&
        data.notification
      ) {
        const n = new Notification(data.notification.title ?? 'TripMate', {
          body: data.notification.body,
          icon: '/icons/icon-192x192.png',
          tag: 'tripmate-foreground',
        });
        n.onclick = () => {
          n.close();
          if (targetUrl) openNotificationTarget(targetUrl);
        };
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
