import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import {
  onDocumentCreated,
  onDocumentUpdated,
  onDocumentWritten,
} from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { setGlobalOptions } from 'firebase-functions/v2';
import {
  collectRoomMemberTokens,
  collectTripMemberTokens,
  getUserDisplayName,
  roomNotificationLink,
  roomNotificationTitle,
  sendMulticastPush,
  sendPushToUser,
  tripNotificationLink,
  tripNotificationTitle,
} from './notifications';
import {
  dispatchDueFitTrackReminders,
  reschedulePreGymReminders,
  scheduleProteinReminderForUser,
} from './fittrackReminders';

setGlobalOptions({ region: 'us-central1' });

admin.initializeApp();

interface InviteRequest {
  targetUserId: string;
  tripId?: string;
  tripName?: string;
  roomId?: string;
  roomName?: string;
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

export const sendTripInvite = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be signed in to send invites.');
  }

  const { targetUserId, tripId, tripName } = request.data as InviteRequest;

  if (!targetUserId || !tripId || !tripName) {
    throw new HttpsError('invalid-argument', 'targetUserId, tripId, and tripName are required.');
  }

  try {
    const link = `/trips/${tripId}`;
    return await sendInvitePush(targetUserId, {
      title: 'New trip invite',
      body: `You've been added to "${tripName}"`,
      link,
      data: { type: 'trip_invite', tripId, tripName },
    });
  } catch (error) {
    console.error('FCM send failed:', error);
    throw new HttpsError('internal', 'Failed to send notification.');
  }
});

export const sendRoomInvite = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be signed in to send invites.');
  }

  const { targetUserId, roomId, roomName } = request.data as InviteRequest;

  if (!targetUserId || !roomId || !roomName) {
    throw new HttpsError('invalid-argument', 'targetUserId, roomId, and roomName are required.');
  }

  try {
    const link = `/rooms/${roomId}`;
    return await sendInvitePush(targetUserId, {
      title: 'New room invite',
      body: `You've been added to "${roomName}"`,
      link,
      data: { type: 'room_invite', roomId, roomName },
    });
  } catch (error) {
    console.error('FCM send failed:', error);
    throw new HttpsError('internal', 'Failed to send notification.');
  }
});

/** Room activity — fires for expenses, settlements, bring list, rent, members, etc. */
export const onRoomAuditLogCreated = onDocumentCreated(
  'roomAuditLogs/{logId}',
  async (event) => {
    const log = event.data?.data();
    if (!log?.roomId || !log?.actorUid || !log?.summary) return;

    const action = String(log.action ?? 'room.update');
    if (action === 'room.created') return;

    const roomId = log.roomId as string;
    const actorUid = log.actorUid as string;
    const tokens = await collectRoomMemberTokens(roomId, actorUid);
    const link = roomNotificationLink(action, roomId);

    await sendMulticastPush(tokens, {
      title: roomNotificationTitle(action),
      body: String(log.summary),
      link,
      data: {
        type: action,
        roomId,
      },
    });
  }
);

/** Trip activity — packing, plan, expenses, members, etc. */
export const onTripAuditLogCreated = onDocumentCreated(
  'tripAuditLogs/{logId}',
  async (event) => {
    const log = event.data?.data();
    if (!log?.tripId || !log?.actorUid || !log?.summary) return;

    const action = String(log.action ?? 'trip.update');
    const tripId = log.tripId as string;
    const actorUid = log.actorUid as string;
    const tokens = await collectTripMemberTokens(tripId, actorUid);
    const link = tripNotificationLink(action, tripId);

    await sendMulticastPush(tokens, {
      title: tripNotificationTitle(action),
      body: String(log.summary),
      link,
      data: {
        type: action,
        tripId,
      },
    });
  }
);

export const onTripSettlementCreated = onDocumentCreated(
  'settlements/{settlementId}',
  async (event) => {
    const settlement = event.data?.data();
    if (!settlement?.tripId || !settlement.fromUid || !settlement.toUid) return;

    const tripId = settlement.tripId as string;
    const savedBy = settlement.savedBy as string | undefined;
    const fromName = await getUserDisplayName(settlement.fromUid as string);
    const toName = await getUserDisplayName(settlement.toUid as string);
    const amount = settlement.amount != null ? String(settlement.amount) : '';
    const tokens = await collectTripMemberTokens(tripId, savedBy);

    await sendMulticastPush(tokens, {
      title: 'Trip settlement',
      body: `${fromName} owes ${toName}${amount ? ` — ${amount}` : ''}`,
      link: tripNotificationLink('settlement.created', tripId),
      data: { type: 'settlement.created', tripId },
    });
  }
);

export const onTripSettlementUpdated = onDocumentUpdated(
  'settlements/{settlementId}',
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!after?.tripId || before?.status === after.status) return;
    if (after.status !== 'paid') return;

    const tripId = after.tripId as string;
    const markedBy = after.paidBy as string | undefined;
    const fromName = await getUserDisplayName(after.fromUid as string);
    const toName = await getUserDisplayName(after.toUid as string);
    const tokens = await collectTripMemberTokens(tripId, markedBy);

    await sendMulticastPush(tokens, {
      title: 'Settlement paid',
      body: `${fromName} → ${toName} marked as paid`,
      link: tripNotificationLink('settlement.paid', tripId),
      data: { type: 'settlement.paid', tripId },
    });
  }
);

/** FitTrack workout saved — personal reminder to the workout owner. */
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
  }
);

/** Dispatch due FitTrack reminders every 5 minutes. */
export const dispatchFitTrackReminders = onSchedule('every 5 minutes', async () => {
  const sent = await dispatchDueFitTrackReminders();
  console.info(`[FitTrack] Dispatched ${sent} gym reminder(s)`);
});

/** Legacy gym module workout log. */
export const onGymWorkoutLogCreated = onDocumentCreated(
  'users/{uid}/gymWorkoutLogs/{logId}',
  async (event) => {
    const uid = event.params.uid;
    const log = event.data?.data();
    if (!log) return;

    const workoutType = (log.workoutType as string) || 'Workout';
    const body = log.notes
      ? `${workoutType} — ${String(log.notes).slice(0, 80)}`
      : `${workoutType} logged`;

    await sendPushToUser(uid, {
      title: 'Gym workout saved',
      body,
      link: '/fittrack/dashboard',
      data: { type: 'gym.workout_saved', path: '/fittrack/dashboard' },
    });
  }
);

/** Client fallback for trip expenses. */
export const onExpenseCreated = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be signed in.');
  }
  const { tripId, amount, category, paidByName, title } = request.data as {
    tripId: string;
    amount: number;
    category: string;
    paidByName: string;
    title?: string;
  };
  if (!tripId) {
    throw new HttpsError('invalid-argument', 'tripId is required.');
  }
  const tokens = await collectTripMemberTokens(tripId, request.auth.uid);
  const label = title || category;
  return {
    sent: await sendMulticastPush(tokens, {
      title: 'New trip expense',
      body: `${paidByName} added "${label}" — ${amount}`,
      link: `/trips/${tripId}/expenses`,
      data: { type: 'expense', tripId },
    }),
  };
});

/** Client fallback when audit trigger has not run yet. */
export const onRoomExpenseCreated = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be signed in.');
  }
  const { roomId, amount, category, paidByName, title } = request.data as {
    roomId: string;
    amount: number;
    category: string;
    paidByName: string;
    title?: string;
  };
  if (!roomId) {
    throw new HttpsError('invalid-argument', 'roomId is required.');
  }
  const tokens = await collectRoomMemberTokens(roomId, request.auth.uid);
  const label = title || category;
  return {
    sent: await sendMulticastPush(tokens, {
      title: 'New room expense',
      body: `${paidByName} added "${label}" — ${amount}`,
      link: `/rooms/${roomId}/expenses`,
      data: { type: 'room_expense', roomId },
    }),
  };
});

/** Generic room activity push from client (settlements, bring list, etc.). */
export const onRoomActivityNotify = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be signed in.');
  }
  const { roomId, title, body, path } = request.data as {
    roomId: string;
    title: string;
    body: string;
    path?: string;
  };
  if (!roomId || !title || !body) {
    throw new HttpsError('invalid-argument', 'roomId, title, and body are required.');
  }
  const tokens = await collectRoomMemberTokens(roomId, request.auth.uid);
  const link = `/rooms/${roomId}${path ?? ''}`;
  return {
    sent: await sendMulticastPush(tokens, {
      title,
      body,
      link,
      data: { type: 'room_activity', roomId },
    }),
  };
});
