'use client';

import { useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/hooks/useAuth';
import { useAppDispatch } from '@/store';
import { updateProfileLocal } from '@/features/auth/authSlice';
import { updateUser } from '@/firebase/users.firestore';
import {
  getPushSetupStatus,
  isPushConfigured,
  requestFCMToken,
  requestNotificationPermissionOnGesture,
  watchNotificationPermission,
  warmPushInfrastructure,
  type NotificationPermissionResult,
  type PushSetupStatus,
} from '@/services/fcmService';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

/**
 * Push-notification opt-in for gym, water and partner reminders. Owns the
 * FCM token lifecycle and the "blocked in browser" recovery dialog.
 */
export function PushNotificationsCard() {
  const dispatch = useAppDispatch();
  const { user, uid } = useAuth();
  const [notifyEnabled, setNotifyEnabled] = useState(false);
  const [notifySaving, setNotifySaving] = useState(false);
  const [pushStatus, setPushStatus] = useState<PushSetupStatus | null>(null);
  const [pushConfigured, setPushConfigured] = useState<boolean | null>(null);
  const [notifyBlockedDialogOpen, setNotifyBlockedDialogOpen] = useState(false);
  const notifyTogglingRef = useRef(false);
  const permissionRequestRef = useRef<Promise<NotificationPermissionResult> | null>(null);

  useEffect(() => {
    warmPushInfrastructure();
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const configured = await isPushConfigured();
      if (!cancelled) setPushConfigured(configured);
      if (uid) {
        const status = await getPushSetupStatus(uid, user?.fcmToken);
        if (!cancelled) setPushStatus(status);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [uid, user?.fcmToken]);

  useEffect(() => {
    if (user && !notifyTogglingRef.current) {
      setNotifyEnabled(user.notifyEnabled ?? false);
    }
  }, [user]);

  useEffect(() => {
    return watchNotificationPermission((permission) => {
      if (uid) {
        getPushSetupStatus(uid, user?.fcmToken).then(setPushStatus);
      }
      if (
        permission === 'granted' &&
        notifyBlockedDialogOpen &&
        !notifyEnabled &&
        uid &&
        !notifyTogglingRef.current
      ) {
        setNotifyBlockedDialogOpen(false);
        void completeNotificationEnable();
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, user?.fcmToken, notifyBlockedDialogOpen, notifyEnabled]);

  const completeNotificationEnable = async () => {
    if (!uid || notifySaving) return;

    const previousEnabled = user?.notifyEnabled ?? false;

    notifyTogglingRef.current = true;
    setNotifySaving(true);
    setNotifyEnabled(true);

    try {
      const result = await requestFCMToken(uid);

      if (!result.token) {
        setNotifyEnabled(previousEnabled);
        if (result.error === 'permission_denied' && Notification.permission === 'denied') {
          setNotifyBlockedDialogOpen(true);
        } else {
          toast.error(result.message);
        }
        return;
      }

      dispatch(updateProfileLocal({ notifyEnabled: true, fcmToken: result.token }));
      const status = await getPushSetupStatus(uid, result.token);
      setPushStatus(status);
      toast.success('Notifications enabled');
    } catch (error) {
      setNotifyEnabled(previousEnabled);
      console.error('Failed to enable notifications:', error);
      toast.error('Could not enable notifications. Try again.');
    } finally {
      notifyTogglingRef.current = false;
      setNotifySaving(false);
    }
  };

  const handleNotificationPointerDown = () => {
    if (notifyEnabled || notifySaving || !uid) return;
    if (typeof Notification === 'undefined') return;
    if (Notification.permission !== 'default') return;
    permissionRequestRef.current = requestNotificationPermissionOnGesture();
  };

  const handleNotificationTap = async () => {
    if (!uid || notifySaving) return;

    const previousEnabled = user?.notifyEnabled ?? false;
    const previousToken = user?.fcmToken ?? '';

    if (notifyEnabled) {
      notifyTogglingRef.current = true;
      setNotifySaving(true);
      try {
        setNotifyEnabled(false);
        await updateUser(uid, { notifyEnabled: false });
        dispatch(updateProfileLocal({ notifyEnabled: false }));
        const status = await getPushSetupStatus(uid, previousToken);
        setPushStatus(status);
        toast.success('Notifications turned off');
      } catch (error) {
        setNotifyEnabled(previousEnabled);
        console.error('Failed to disable notifications:', error);
        toast.error('Could not update notification settings');
      } finally {
        notifyTogglingRef.current = false;
        setNotifySaving(false);
      }
      return;
    }

    if (typeof Notification !== 'undefined' && Notification.permission === 'denied') {
      setNotifyBlockedDialogOpen(true);
      return;
    }

    const permissionResult = permissionRequestRef.current
      ? await permissionRequestRef.current
      : await requestNotificationPermissionOnGesture();
    permissionRequestRef.current = null;

    if (!permissionResult.granted) {
      if (permissionResult.blocked) {
        setNotifyBlockedDialogOpen(true);
      } else {
        toast.error(permissionResult.message);
      }
      return;
    }

    await completeNotificationEnable();
  };

  const handleRetryNotificationUnblock = async () => {
    if (!uid || notifySaving) return;

    const permissionResult = await requestNotificationPermissionOnGesture();
    if (!permissionResult.granted) {
      toast.error(
        permissionResult.blocked
          ? 'Still blocked — allow notifications for this site in your browser, then tap Try again.'
          : permissionResult.message
      );
      return;
    }

    setNotifyBlockedDialogOpen(false);
    await completeNotificationEnable();
  };

  let statusCopy = 'One tap to allow — your browser will ask you to confirm.';
  if (notifyEnabled) statusCopy = 'You will get gym, water and training-partner reminders.';
  else if (pushStatus?.permission === 'denied') statusCopy = 'Blocked in browser — tap the switch for steps to allow.';

  return (
    <section id="notifications" className="ft-card ft-card-padded scroll-mt-24">
      <div className="flex items-center gap-2 mb-1">
        <Bell className="h-4 w-4 text-primary" />
        <h2 className="ft-title font-semibold">Push Notifications</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Needed for reminders to reach you when the app is closed.
      </p>

      <div className="flex items-center justify-between gap-4 bg-muted/30 p-4 rounded-2xl">
        <div className="space-y-0.5 min-w-0">
          <p className="text-sm font-bold">Push notifications</p>
          <p className="text-[10px] font-medium text-muted-foreground leading-snug">{statusCopy}</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={notifyEnabled}
          aria-label={notifyEnabled ? 'Disable notifications' : 'Enable notifications'}
          disabled={notifySaving || pushConfigured === false}
          onPointerDown={handleNotificationPointerDown}
          onClick={handleNotificationTap}
          className={`relative inline-flex h-8 w-14 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50 ${
            notifyEnabled ? 'bg-primary' : 'bg-muted-foreground/30'
          }`}
        >
          <span
            className={`inline-block h-6 w-6 transform rounded-full bg-white shadow transition-transform ${
              notifyEnabled ? 'translate-x-7' : 'translate-x-1'
            }`}
          />
        </button>
      </div>
      {notifySaving && (
        <p className="text-xs text-muted-foreground text-center mt-3">Setting up notifications…</p>
      )}
      {pushConfigured === false && (
        <p className="text-xs text-amber-700 dark:text-amber-400 font-medium rounded-xl bg-amber-500/10 p-3 mt-3">
          Push is not configured on this server. Contact the app admin.
        </p>
      )}
      {pushStatus && !pushStatus.messagingSupported && (
        <p className="text-xs text-amber-600 font-medium rounded-xl bg-amber-500/10 p-3 mt-3">
          This browser does not support web push. On iPhone, add FitTrack to your Home Screen first,
          then enable notifications here.
        </p>
      )}

      <Dialog open={notifyBlockedDialogOpen} onOpenChange={setNotifyBlockedDialogOpen}>
        <DialogContent className="rounded-[24px] max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-lg font-black">Allow notifications</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm text-muted-foreground">
            <p>
              Notifications were blocked earlier. Browsers cannot show the Allow popup again until
              you turn them on for this site.
            </p>
            <ol className="list-decimal list-inside space-y-2 font-medium text-foreground">
              <li>Tap the lock or site icon in the address bar</li>
              <li>
                Open <span className="font-bold">Site settings</span> or{' '}
                <span className="font-bold">Permissions</span>
              </li>
              <li>
                Set <span className="font-bold">Notifications</span> to Allow
              </li>
              <li>Return here and tap Try again</li>
            </ol>
            <p className="text-xs">
              On Chrome mobile: menu (⋮) → Settings → Site settings → Notifications → find this
              site and allow.
            </p>
          </div>
          <Button
            onClick={handleRetryNotificationUnblock}
            disabled={notifySaving}
            className="w-full rounded-xl h-11 font-bold"
          >
            {notifySaving ? 'Setting up…' : 'Try again'}
          </Button>
        </DialogContent>
      </Dialog>
    </section>
  );
}
