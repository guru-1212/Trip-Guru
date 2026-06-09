'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { saveWaterSettings, getWaterSettings } from '@/firebase/water.firestore';
import { resolveWaterNotificationsEnabled } from '@/lib/water/waterUtils';
import {
  warmPushInfrastructure,
  requestNotificationPermissionOnGesture,
  requestFCMToken,
  watchNotificationPermission,
  type NotificationPermissionResult,
} from '@/services/fcmService';
import { syncWaterReminderSchedule } from '@/services/waterNotificationService';

export function useWaterNotifications() {
  const { uid, user } = useAuth();
  const waterUid = uid;
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
    if (!waterUid) return;

    const isGranted =
      typeof Notification !== 'undefined' && Notification.permission === 'granted';

    void getWaterSettings(waterUid)
      .then(async (settings) => {
        const resolved = resolveWaterNotificationsEnabled(settings, globalNotifyEnabled);

        if (globalNotifyEnabled && isGranted && resolved && !settings.notificationsEnabled) {
          await saveWaterSettings(waterUid, {
            notificationsEnabled: true,
            waterRemindersOptOut: false,
          });
          await syncWaterReminderSchedule();
          setEnabled(true);
          return;
        }

        if (resolved && isGranted && settings.notificationsEnabled) {
          await syncWaterReminderSchedule();
        }

        setEnabled(resolved);
      })
      .catch(() => setEnabled(globalNotifyEnabled && isGranted));
  }, [waterUid, globalNotifyEnabled]);

  const completeEnable = useCallback(async () => {
    if (!uid || !waterUid) return;
    setLoading(true);
    setError(null);
    try {
      await requestFCMToken(uid);
      await saveWaterSettings(waterUid, {
        notificationsEnabled: true,
        waterRemindersOptOut: false,
      });
      await syncWaterReminderSchedule();
      setEnabled(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to enable notifications');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [uid, waterUid]);

  const promptEnable = useCallback(async () => {
    if (!uid || !waterUid || loading) return;

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
  }, [uid, waterUid, loading, completeEnable]);

  const startPermissionOnPointerDown = useCallback(() => {
    permissionRequestRef.current = requestNotificationPermissionOnGesture();
  }, []);

  const disableNotifications = useCallback(async () => {
    if (!waterUid) return;
    setLoading(true);
    setError(null);
    try {
      await saveWaterSettings(waterUid, {
        notificationsEnabled: false,
        waterRemindersOptOut: true,
      });
      setEnabled(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disable notifications');
    } finally {
      setLoading(false);
    }
  }, [waterUid]);

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
