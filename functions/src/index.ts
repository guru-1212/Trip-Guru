import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onDocumentCreated, onDocumentWritten } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { setGlobalOptions } from 'firebase-functions/v2';
import { sendPushToUser } from './notifications';
import {
  dispatchDueFitTrackReminders,
  reschedulePreGymReminders,
  scheduleProteinReminderForUser,
} from './fittrackReminders';
import {
  dispatchDueWaterReminders,
  rescheduleWaterReminders,
  handleWaterLogGoalAndStreak,
} from './waterReminders';

setGlobalOptions({ region: 'us-central1' });

if (!admin.apps.length) {
  admin.initializeApp();
}

async function sendInvitePush(
  targetUserId: string,
  payload: { title: string; body: string; link: string; data: Record<string, string> }
): Promise<{ sent: boolean; reason?: string }> {
  const sent = await sendPushToUser(targetUserId, payload);
  if (sent === 0) {
    return { sent: false, reason: 'no_tokens_or_disabled' };
  }
  return { sent: true };
}

export const sendFitTrackInvite = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be signed in to send invites.');
  }

  const { targetUserId, ownerName } = request.data as {
    targetUserId?: string;
    ownerName?: string;
  };

  if (!targetUserId || !ownerName) {
    throw new HttpsError('invalid-argument', 'targetUserId and ownerName are required.');
  }

  try {
    const link = '/fittrack/dashboard';
    return await sendInvitePush(targetUserId, {
      title: 'Training partner invite',
      body: `${ownerName} invited you to share their FitTrack workout plan`,
      link,
      data: { type: 'fittrack_invite', ownerName },
    });
  } catch (error) {
    console.error('FCM send failed:', error);
    throw new HttpsError('internal', 'Failed to send notification.');
  }
});

export const onFitTrackWorkoutCreated = onDocumentCreated(
  'users/{uid}/fittrackWorkouts/{workoutId}',
  async (event) => {
    const uid = event.params.uid;
    const workout = event.data?.data();
    if (!workout) return;

    const split = (workout.splitId as string) || 'workout';
    const exerciseCount = Array.isArray(workout.exercises) ? workout.exercises.length : 0;
    const body =
      exerciseCount > 0
        ? `${exerciseCount} exercise${exerciseCount === 1 ? '' : 's'} logged (${split})`
        : `Workout logged (${split})`;

    await sendPushToUser(uid, {
      title: 'Workout saved',
      body,
      link: '/fittrack/dashboard',
      data: { type: 'gym.workout_saved', path: '/fittrack/dashboard' },
    });

    const profileSnap = await admin.firestore().doc(`users/${uid}/fittrack/profile`).get();
    if (profileSnap.exists) {
      await scheduleProteinReminderForUser(uid, profileSnap.data() ?? {});
    }
  }
);

/** Reschedule pre-gym reminders when FitTrack profile changes. */
export const onFitTrackProfileWritten = onDocumentWritten(
  'users/{uid}/fittrack/profile',
  async (event) => {
    const uid = event.params.uid;
    const after = event.data?.after.data();
    if (!after) return;
    await reschedulePreGymReminders(uid, after);
    await rescheduleWaterReminders(uid, undefined, after);
  }
);

/** Reschedule water reminders when settings change. */
export const onWaterSettingsWritten = onDocumentWritten(
  'users/{uid}/waterSettings/settings',
  async (event) => {
    const uid = event.params.uid;
    const after = event.data?.after.data();
    if (!after) return;
    await rescheduleWaterReminders(uid, after);
  }
);

/** Goal complete + streak milestone notifications. */
export const onWaterLogWritten = onDocumentWritten(
  'users/{uid}/waterLogs/{dateKey}',
  async (event) => {
    const uid = event.params.uid;
    const dateKey = event.params.dateKey;
    const before = event.data?.before.data() as { totalMl?: number; goalMl?: number; completed?: boolean } | undefined;
    const after = event.data?.after.data() as { totalMl?: number; goalMl?: number; completed?: boolean } | undefined;
    await handleWaterLogGoalAndStreak(uid, before, after, dateKey);
  }
);

/** Dispatch due FitTrack reminders every 5 minutes. */
export const dispatchFitTrackReminders = onSchedule('every 5 minutes', async () => {
  const gymSent = await dispatchDueFitTrackReminders();
  const waterSent = await dispatchDueWaterReminders();
  console.info(`[FitTrack] Dispatched ${gymSent} gym reminder(s), ${waterSent} water reminder(s)`);
});

export const rescheduleWaterRemindersCallable = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be signed in.');
  }
  const uid = request.auth.uid;
  const scheduled = await rescheduleWaterReminders(uid);
  return { ok: true, scheduled };
});
