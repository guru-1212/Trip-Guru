'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getFitTrackOwnerId } from '@/firebase/fittrackPartners.firestore';
import { saveWaterSettings, getWaterSettings } from '@/firebase/water.firestore';
import { resolveWaterNotificationsEnabled } from '@/lib/water/waterUtils';
import {
  warmPushInfrastructure,
  requestNotificationPermissionOnGesture,
  requestFCMToken,
  watchNotificationPermission,
  type NotificationPermissionResult,
} from '@/services/fcmService';

export function useWaterNotifications() {
  const { uid, user } = useAuth();
  const effectiveUid = uid ? getFitTrackOwnerId(uid, user) : null;
  const globalNotifyEnabled = user?.notifyEnabled !== false;

  const [enabled, setEnabled] = useState(() => globalNotifyEnabled);
  const [permission, setPermission] = useState<NotificationPermission>(() =>
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const permissionRequestRef = useRef<Promise<NotificationPermissionResult> | null>(null);

  useEffect(() => {
    warmPushInfrastructure();
  }, []);

  useEffect(() => {
    if (typeof Notification === 'undefined') return;
    setPermission(Notification.permission);

    return watchNotificationPermission((perm) => {
      setPermission(perm as NotificationPermission);
      if (perm === 'granted' && uid) {
        void requestFCMToken(uid);
      }
    });
  }, [uid]);

  useEffect(() => {
    if (!effectiveUid) return;

    const isGranted =
      typeof Notification !== 'undefined' && Notification.permission === 'granted';

    void getWaterSettings(effectiveUid)
      .then(async (settings) => {
        const resolved = resolveWaterNotificationsEnabled(settings, globalNotifyEnabled);

        // Sync profile opt-in to water settings when user hasn't explicitly opted out
        if (globalNotifyEnabled && isGranted && resolved && !settings.notificationsEnabled) {
          await saveWaterSettings(effectiveUid, {
            notificationsEnabled: true,
            waterRemindersOptOut: false,
          });
          setEnabled(true);
          return;
        }

        setEnabled(resolved);
      })
      .catch(() => setEnabled(globalNotifyEnabled && isGranted));
  }, [effectiveUid, globalNotifyEnabled]);

  const completeEnable = useCallback(async () => {
    if (!uid || !effectiveUid) return;
    setLoading(true);
    setError(null);
    try {
      await requestFCMToken(uid);
      await saveWaterSettings(effectiveUid, {
        notificationsEnabled: true,
        waterRemindersOptOut: false,
      });
      setEnabled(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to enable notifications');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [uid, effectiveUid]);

  const promptEnable = useCallback(async () => {
    if (!uid || !effectiveUid || loading) return;

    const permissionResult = permissionRequestRef.current
      ? await permissionRequestRef.current
      : await requestNotificationPermissionOnGesture();
    permissionRequestRef.current = null;

    setPermission(permissionResult.permission as NotificationPermission);

    if (!permissionResult.granted) {
      if (permissionResult.blocked) {
        setError('blocked');
      } else {
        setError('denied');
      }
      return;
    }

    await completeEnable();
  }, [uid, effectiveUid, loading, completeEnable]);

  const startPermissionOnPointerDown = useCallback(() => {
    permissionRequestRef.current = requestNotificationPermissionOnGesture();
  }, []);

  const disableNotifications = useCallback(async () => {
    if (!effectiveUid) return;
    setLoading(true);
    setError(null);
    try {
      await saveWaterSettings(effectiveUid, {
        notificationsEnabled: false,
        waterRemindersOptOut: true,
      });
      setEnabled(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disable notifications');
    } finally {
      setLoading(false);
    }
  }, [effectiveUid]);

  const isBlocked = permission === 'denied';
  const isGranted = permission === 'granted';

  return {
    enabled: enabled && isGranted && globalNotifyEnabled,
    waterNotificationsEnabled: enabled,
    permission,
    loading,
    error,
    isBlocked,
    isGranted,
    globalNotifyEnabled,
    promptEnable,
    startPermissionOnPointerDown,
    disableNotifications,
    completeEnable,
    profileSettingsUrl: '/profile',
  };
}
