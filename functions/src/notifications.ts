import * as admin from 'firebase-admin';

function db() {
  return admin.firestore();
}

export interface PushPayload {
  title: string;
  body: string;
  link: string;
  data: Record<string, string>;
}

function uniqueTokens(raw: string[]): string[] {
  return [...new Set(raw.filter((t) => typeof t === 'string' && t.length > 0))];
}

function tokensFromUserData(
  data: FirebaseFirestore.DocumentData | undefined
): string[] {
  if (!data || data.notifyEnabled === false) return [];
  const fromArray = (data.fcmTokens as string[] | undefined) ?? [];
  const legacy = data.fcmToken as string | undefined;
  return uniqueTokens(legacy ? [...fromArray, legacy] : fromArray);
}

export async function collectRoomMemberTokens(
  roomId: string,
  excludeUid?: string
): Promise<string[]> {
  const membersSnap = await db()
    .collection('roomMembers')
    .where('roomId', '==', roomId)
    .where('inviteStatus', '==', 'accepted')
    .get();

  const tokens: string[] = [];
  for (const memberDoc of membersSnap.docs) {
    const userId = memberDoc.data().userId as string | null;
    if (!userId || userId === excludeUid) continue;
    const userSnap = await db().doc(`users/${userId}`).get();
    tokens.push(...tokensFromUserData(userSnap.data()));
  }
  return uniqueTokens(tokens);
}

export async function collectTripMemberTokens(
  tripId: string,
  excludeUid?: string
): Promise<string[]> {
  const membersSnap = await db()
    .collection('tripMembers')
    .where('tripId', '==', tripId)
    .where('inviteStatus', '==', 'accepted')
    .get();

  const tokens: string[] = [];
  for (const memberDoc of membersSnap.docs) {
    const userId = memberDoc.data().userId as string | null;
    if (!userId || userId === excludeUid) continue;
    const userSnap = await db().doc(`users/${userId}`).get();
    tokens.push(...tokensFromUserData(userSnap.data()));
  }
  return uniqueTokens(tokens);
}

export async function getUserDisplayName(uid: string): Promise<string> {
  const snap = await db().doc(`users/${uid}`).get();
  return (snap.data()?.name as string) || 'Someone';
}

export async function collectUserTokens(uid: string): Promise<string[]> {
  const snap = await db().doc(`users/${uid}`).get();
  if (!snap.exists) return [];
  return tokensFromUserData(snap.data());
}

export async function sendPushToUser(
  targetUserId: string,
  payload: PushPayload
): Promise<number> {
  const tokens = await collectUserTokens(targetUserId);
  return sendMulticastPush(tokens, payload);
}

export function roomNotificationLink(
  action: string,
  roomId: string
): string {
  if (action.startsWith('expense.')) return `/rooms/${roomId}/expenses`;
  if (action.startsWith('settlement.')) return `/rooms/${roomId}/settlement`;
  if (action.startsWith('bring_item.')) return `/rooms/${roomId}/bring`;
  if (action.startsWith('rent.')) return `/rooms/${roomId}/rent`;
  if (action.startsWith('member.')) return `/rooms/${roomId}/members`;
  if (action === 'cycle.closed') return `/rooms/${roomId}/history`;
  return `/rooms/${roomId}`;
}

export function roomNotificationTitle(action: string): string {
  if (action.startsWith('expense.')) return 'Room expense';
  if (action.startsWith('settlement.')) return 'Settlement';
  if (action.startsWith('bring_item.')) return 'Things to bring';
  if (action.startsWith('rent.')) return 'Rent';
  if (action.startsWith('member.')) return 'Room member';
  if (action === 'cycle.closed') return 'Billing cycle';
  return 'Room update';
}

export function tripNotificationLink(
  type: string,
  tripId: string
): string {
  if (type.startsWith('settlement')) return `/trips/${tripId}/settlement`;
  if (type.startsWith('expense')) return `/trips/${tripId}/expenses`;
  if (type.startsWith('member')) return `/trips/${tripId}/members`;
  return `/trips/${tripId}`;
}

export async function sendMulticastPush(
  tokens: string[],
  payload: PushPayload
): Promise<number> {
  if (tokens.length === 0) return 0;

  const response = await admin.messaging().sendEachForMulticast({
    tokens,
    notification: {
      title: payload.title,
      body: payload.body,
    },
    data: {
      ...payload.data,
      url: payload.link,
    },
    webpush: {
      fcmOptions: { link: payload.link },
      notification: {
        icon: '/icons/icon-192x192.png',
      },
    },
  });

  return response.successCount;
}
