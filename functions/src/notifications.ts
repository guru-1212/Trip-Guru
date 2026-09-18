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
