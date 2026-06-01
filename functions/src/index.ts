import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { setGlobalOptions } from 'firebase-functions/v2';

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
      },
      webpush: {
        fcmOptions: {
          link: `/trips/${tripId}`,
        },
      },
    });
    return { sent: true };
  } catch (error) {
    console.error('FCM send failed:', error);
    throw new HttpsError('internal', 'Failed to send notification.');
  }
});

export const onExpenseCreated = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be signed in.');
  }

  const { tripId, amount, category, paidByName } = request.data as {
    tripId: string;
    amount: number;
    category: string;
    paidByName: string;
  };

  if (!tripId) {
    throw new HttpsError('invalid-argument', 'tripId is required.');
  }

  const membersSnap = await admin
    .firestore()
    .collection('tripMembers')
    .where('tripId', '==', tripId)
    .where('inviteStatus', '==', 'accepted')
    .get();

  const tokens: string[] = [];
  for (const doc of membersSnap.docs) {
    const userId = doc.data().userId as string | null;
    if (!userId || userId === request.auth.uid) continue;
    const userSnap = await admin.firestore().doc(`users/${userId}`).get();
    const token = userSnap.data()?.fcmToken as string | undefined;
    if (token && userSnap.data()?.notifyEnabled !== false) {
      tokens.push(token);
    }
  }

  if (tokens.length === 0) {
    return { sent: 0 };
  }

  const response = await admin.messaging().sendEachForMulticast({
    tokens,
    notification: {
      title: 'New expense',
      body: `${paidByName} added ${category} — ${amount}`,
    },
    data: { type: 'expense', tripId },
    webpush: {
      fcmOptions: { link: `/trips/${tripId}/expenses` },
    },
  });

  return { sent: response.successCount };
});

export const onRoomExpenseCreated = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be signed in.');
  }

  const { roomId, amount, category, paidByName } = request.data as {
    roomId: string;
    amount: number;
    category: string;
    paidByName: string;
  };

  if (!roomId) {
    throw new HttpsError('invalid-argument', 'roomId is required.');
  }

  const membersSnap = await admin
    .firestore()
    .collection('roomMembers')
    .where('roomId', '==', roomId)
    .where('inviteStatus', '==', 'accepted')
    .get();

  const tokens: string[] = [];
  for (const doc of membersSnap.docs) {
    const userId = doc.data().userId as string | null;
    if (!userId || userId === request.auth.uid) continue;
    const userSnap = await admin.firestore().doc(`users/${userId}`).get();
    const token = userSnap.data()?.fcmToken as string | undefined;
    if (token && userSnap.data()?.notifyEnabled !== false) {
      tokens.push(token);
    }
  }

  if (tokens.length === 0) {
    return { sent: 0 };
  }

  const response = await admin.messaging().sendEachForMulticast({
    tokens,
    notification: {
      title: 'New room expense',
      body: `${paidByName} added ${category} — ${amount}`,
    },
    data: { type: 'room_expense', roomId },
    webpush: {
      fcmOptions: { link: `/rooms/${roomId}/expenses` },
    },
  });

  return { sent: response.successCount };
});
