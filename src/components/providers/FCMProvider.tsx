'use client';

import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  onForegroundMessage,
  openNotificationTarget,
  requestFCMToken,
} from '@/services/fcmService';

/** Every FitTrack push sets `data.url` (see functions/src/notifications.ts). */
function getPayloadUrl(payload: unknown): string | null {
  const p = payload as {
    data?: { url?: string; path?: string };
  };
  return p.data?.url ?? p.data?.path ?? null;
}

export function FCMProvider({ children }: { children: React.ReactNode }) {
  const { uid, user } = useAuth();

  useEffect(() => {
    if (!uid) return;
    if (
      user?.notifyEnabled !== false &&
      typeof Notification !== 'undefined' &&
      Notification.permission === 'granted'
    ) {
      requestFCMToken(uid).catch((err) =>
        console.warn('FCM background registration failed:', err)
      );
    }
  }, [uid, user?.notifyEnabled]);

  useEffect(() => {
    if (!uid) return;

    let unsubscribe: (() => void) | null = null;

    onForegroundMessage((payload) => {
      const data = payload as {
        data?: { type?: string };
        notification?: { title?: string; body?: string };
      };
      const targetUrl = getPayloadUrl(payload);

      if (data.data?.type === 'gym.workout_saved') {
        return;
      }

      if (
        typeof window !== 'undefined' &&
        'Notification' in window &&
        Notification.permission === 'granted' &&
        data.notification
      ) {
        const n = new Notification(data.notification.title ?? 'FitTrack', {
          body: data.notification.body,
          icon: '/logo.svg',
          tag: 'fittrack-foreground',
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
