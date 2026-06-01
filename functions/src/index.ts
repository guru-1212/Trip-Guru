import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import {
  onDocumentCreated,
  onDocumentUpdated,
  onDocumentDeleted,
} from 'firebase-functions/v2/firestore';
import { setGlobalOptions } from 'firebase-functions/v2';
import {
  collectRoomMemberTokens,
  collectTripMemberTokens,
  getUserDisplayName,
  roomNotificationLink,
  roomNotificationTitle,
  sendMulticastPush,
} from './notifications';

setGlobalOptions({ region: 'us-central1' });

admin.initializeApp();

interface SendTripInviteRequest {
  targetUserId: string;
  tripId: string;
  tripName: string;
}

export const sendTripInvite = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be signed in to send invites.');
  }

  const { targetUserId, tripId, tripName } = request.data as SendTripInviteRequest;

  if (!targetUserId || !tripId || !tripName) {
    throw new HttpsError('invalid-argument', 'targetUserId, tripId, and tripName are required.');
  }

  const userSnap = await admin.firestore().doc(`users/${targetUserId}`).get();
  if (!userSnap.exists) {
    return { sent: false, reason: 'user_not_found' };
  }

  const userData = userSnap.data();
  if (userData?.notifyEnabled === false) {
    return { sent: false, reason: 'notifications_disabled' };
  }

  const fcmToken = userData?.fcmToken as string | undefined;
  if (!fcmToken) {
    return { sent: false, reason: 'no_fcm_token' };
  }

  try {
    const link = `/trips/${tripId}`;
    await admin.messaging().send({
      token: fcmToken,
      notification: {
        title: 'New trip invite',
        body: `You've been added to "${tripName}"`,
      },
      data: {
        type: 'trip_invite',
        tripId,
        tripName,
        url: link,
      },
      webpush: {
        fcmOptions: { link },
      },
    });
    return { sent: true };
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

function formatTripExpenseBody(
  actorName: string,
  verb: 'added' | 'updated' | 'removed',
  expense: FirebaseFirestore.DocumentData
): string {
  const title = expense.title || expense.category || 'expense';
  const amount = expense.amount != null ? ` — ${expense.amount}` : '';
  return `${actorName} ${verb} ${title}${amount}`;
}

export const onTripExpenseCreated = onDocumentCreated(
  'expenses/{expenseId}',
  async (event) => {
    const expense = event.data?.data();
    if (!expense?.tripId || expense.expenseType === 'planned') return;

    const createdBy = expense.createdBy as string | undefined;
    if (!createdBy) return;

    const actorName = await getUserDisplayName(createdBy);
    const tokens = await collectTripMemberTokens(
      expense.tripId as string,
      createdBy
    );
    const tripId = expense.tripId as string;
    const link = `/trips/${tripId}/expenses`;

    await sendMulticastPush(tokens, {
      title: 'New trip expense',
      body: formatTripExpenseBody(actorName, 'added', expense),
      link,
      data: { type: 'expense.created', tripId },
    });
  }
);

export const onTripExpenseUpdated = onDocumentUpdated(
  'expenses/{expenseId}',
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!after?.tripId || after.expenseType === 'planned') return;

    const createdBy = after.createdBy as string | undefined;
    if (!createdBy) return;

    const changed =
      before?.amount !== after.amount ||
      before?.title !== after.title ||
      before?.category !== after.category ||
      before?.paidBy !== after.paidBy;
    if (!changed) return;

    const actorName = await getUserDisplayName(createdBy);
    const tokens = await collectTripMemberTokens(after.tripId as string, createdBy);
    const tripId = after.tripId as string;

    await sendMulticastPush(tokens, {
      title: 'Expense updated',
      body: formatTripExpenseBody(actorName, 'updated', after),
      link: `/trips/${tripId}/expenses`,
      data: { type: 'expense.updated', tripId },
    });
  }
);

export const onTripExpenseDeleted = onDocumentDeleted(
  'expenses/{expenseId}',
  async (event) => {
    const expense = event.data?.data();
    if (!expense?.tripId || expense.expenseType === 'planned') return;

    const createdBy = expense.createdBy as string | undefined;
    if (!createdBy) return;

    const actorName = await getUserDisplayName(createdBy);
    const tokens = await collectTripMemberTokens(
      expense.tripId as string,
      createdBy
    );
    const tripId = expense.tripId as string;

    await sendMulticastPush(tokens, {
      title: 'Expense removed',
      body: formatTripExpenseBody(actorName, 'removed', expense),
      link: `/trips/${tripId}/expenses`,
      data: { type: 'expense.deleted', tripId },
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
