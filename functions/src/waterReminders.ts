import * as admin from 'firebase-admin';
import { sendPushToUser } from './notifications';
import {
  getLocalDateString,
  getDayKeyInTimezone,
  localDateTimeInZoneToUtc,
} from './fittrackReminders';

type DayKey = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';
type SplitId = 'ct' | 'bb' | 'sh' | 'ctbb' | 'legs' | 'core' | 'coresh' | 'rest';

type WaterReminderType =
  | 'scheduled'
  | 'behind_pace'
  | 'post_gym'
  | 'goal_complete'
  | 'streak_milestone';

const WATER_URL = '/fittrack/water';
const DEFAULT_TIMEZONE = 'Asia/Kolkata';
const STREAK_MILESTONES = [3, 7, 14, 30];

interface WaterScheduleSlot {
  time: string;
  amountGym: number;
  amountRest: number;
  label: string;
  note: string;
}

interface WaterSettings {
  dailyGoalRest?: number;
  dailyGoalGym?: number;
  notificationsEnabled?: boolean;
  timezone?: string;
  schedule?: WaterScheduleSlot[];
  lastStreakMilestone?: number;
}

interface FitTrackProfile {
  weekSchedule?: Record<DayKey, SplitId>;
  timezone?: string;
}

interface WaterLogDoc {
  totalMl?: number;
  goalMl?: number;
  completed?: boolean;
}

function db() {
  return admin.firestore();
}

function remindersCol(uid: string) {
  return db().collection('users').doc(uid).collection('waterReminders');
}

function settingsDoc(uid: string) {
  return db().collection('users').doc(uid).collection('waterSettings').doc('settings');
}

function waterLogDoc(uid: string, dateKey: string) {
  return db().collection('users').doc(uid).collection('waterLogs').doc(dateKey);
}

function getDefaultSchedule(): WaterScheduleSlot[] {
  return [
    { time: '08:00', amountGym: 300, amountRest: 250, label: 'Morning kickstart', note: 'Rehydrate after sleep' },
    { time: '09:30', amountGym: 250, amountRest: 250, label: 'Mid-morning', note: 'Stay ahead of pace' },
    { time: '11:00', amountGym: 300, amountRest: 275, label: 'Pre-lunch', note: 'Digestive support' },
    { time: '12:30', amountGym: 350, amountRest: 300, label: 'Lunch window', note: 'Meal-time hydration' },
    { time: '14:00', amountGym: 300, amountRest: 275, label: 'Afternoon', note: 'Beat the slump' },
    { time: '15:30', amountGym: 500, amountRest: 300, label: 'Pre-workout fuel', note: 'Pre-workout fuel — drink 500 ml' },
    { time: '17:00', amountGym: 400, amountRest: 300, label: 'During workout', note: 'Intra-workout sip' },
    { time: '19:00', amountGym: 450, amountRest: 350, label: 'Post-workout', note: 'Recovery hydration' },
    { time: '20:30', amountGym: 350, amountRest: 300, label: 'Evening', note: 'Wind-down refill' },
    { time: '21:30', amountGym: 300, amountRest: 250, label: 'Night cap', note: 'Final push to goal' },
    { time: '22:30', amountGym: 300, amountRest: 250, label: 'Before bed', note: 'Last sip before sleep' },
  ];
}

function isGymDay(weekSchedule: Record<DayKey, SplitId>, dayKey: DayKey): boolean {
  return weekSchedule[dayKey] !== 'rest';
}

function getSlotAmount(slot: WaterScheduleSlot, gymDay: boolean): number {
  return gymDay ? slot.amountGym : slot.amountRest;
}

function isWithinActiveWindow(time: string): boolean {
  const [h, m] = time.split(':').map((x) => parseInt(x, 10));
  const minutes = h * 60 + m;
  const wake = 8 * 60;
  const lastSlot = 22 * 60 + 30;
  return minutes >= wake && minutes <= lastSlot;
}

function reminderFcmType(type: WaterReminderType): string {
  return `water.reminder.${type}`;
}

async function cancelPendingWaterReminders(uid: string, types?: WaterReminderType[]): Promise<void> {
  let q = remindersCol(uid).where('status', '==', 'pending');
  if (types && types.length === 1) {
    q = q.where('type', '==', types[0]);
  }
  const snap = await q.get();
  if (snap.empty) return;

  const batch = db().batch();
  snap.docs.forEach((docSnap) => {
    if (types && types.length > 1 && !types.includes(docSnap.data().type as WaterReminderType)) {
      return;
    }
    batch.update(docSnap.ref, {
      status: 'cancelled',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });
  await batch.commit();
}

export async function rescheduleWaterReminders(
  uid: string,
  settingsInput?: WaterSettings | null,
  profileInput?: FitTrackProfile | null
): Promise<void> {
  const settingsSnap = settingsInput
    ? null
    : await settingsDoc(uid).get();
  const settings = settingsInput ?? (settingsSnap?.data() as WaterSettings | undefined);

  if (!settings?.notificationsEnabled) {
    await cancelPendingWaterReminders(uid, ['scheduled', 'behind_pace', 'post_gym']);
    return;
  }

  const profileSnap = profileInput
    ? null
    : await db().doc(`users/${uid}/fittrack/profile`).get();
  const profile = profileInput ?? (profileSnap?.data() as FitTrackProfile | undefined);
  const weekSchedule = profile?.weekSchedule;
  if (!weekSchedule) return;

  const timeZone = settings.timezone || profile?.timezone || DEFAULT_TIMEZONE;
  const schedule = settings.schedule?.length ? settings.schedule : getDefaultSchedule();

  await cancelPendingWaterReminders(uid, ['scheduled', 'behind_pace', 'post_gym']);

  const now = new Date();
  const batch = db().batch();
  let writes = 0;

  for (let offset = 0; offset < 7; offset++) {
    const day = new Date(now.getTime() + offset * 24 * 60 * 60 * 1000);
    const localDate = getLocalDateString(day, timeZone);
    const dayKey = getDayKeyInTimezone(day, timeZone);
    const gymDay = isGymDay(weekSchedule, dayKey);

    for (const slot of schedule) {
      if (!isWithinActiveWindow(slot.time)) continue;

      const sendAt = localDateTimeInZoneToUtc(localDate, slot.time, timeZone);
      if (sendAt.getTime() <= now.getTime()) continue;

      const amount = getSlotAmount(slot, gymDay);
      const id = `scheduled_${localDate}_${slot.time.replace(':', '')}`;
      batch.set(
        remindersCol(uid).doc(id),
        {
          type: 'scheduled',
          sendAt: admin.firestore.Timestamp.fromDate(sendAt),
          status: 'pending',
          localDate,
          payload: {
            title: slot.label,
            body: `${slot.note} — drink ${amount} ml`,
            url: WATER_URL,
          },
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      writes++;
    }

    const behindAt = localDateTimeInZoneToUtc(localDate, '18:00', timeZone);
    if (behindAt.getTime() > now.getTime()) {
      batch.set(
        remindersCol(uid).doc(`behind_pace_${localDate}`),
        {
          type: 'behind_pace',
          sendAt: admin.firestore.Timestamp.fromDate(behindAt),
          status: 'pending',
          localDate,
          payload: {
            title: 'Catch up on hydration',
            body: "You're below 60% of today's goal — time to drink up!",
            url: WATER_URL,
          },
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      writes++;
    }

    if (gymDay) {
      const postGymAt = localDateTimeInZoneToUtc(localDate, '19:30', timeZone);
      if (postGymAt.getTime() > now.getTime()) {
        batch.set(
          remindersCol(uid).doc(`post_gym_${localDate}`),
          {
            type: 'post_gym',
            sendAt: admin.firestore.Timestamp.fromDate(postGymAt),
            status: 'pending',
            localDate,
            payload: {
              title: 'Post-gym recovery',
              body: 'Recovery hydration — drink 450 ml within the next 30 minutes',
              url: WATER_URL,
            },
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
        writes++;
      }
    }
  }

  if (writes > 0) await batch.commit();
}

async function shouldSendBehindPace(uid: string, localDate: string): Promise<boolean> {
  const logSnap = await waterLogDoc(uid, localDate).get();
  if (!logSnap.exists) return true;
  const log = logSnap.data() as WaterLogDoc;
  const goalMl = log.goalMl ?? 3000;
  const totalMl = log.totalMl ?? 0;
  return totalMl < goalMl * 0.6;
}

export async function dispatchDueWaterReminders(): Promise<number> {
  const now = admin.firestore.Timestamp.now();
  const snap = await db()
    .collectionGroup('waterReminders')
    .where('status', '==', 'pending')
    .where('sendAt', '<=', now)
    .limit(200)
    .get();

  let sent = 0;

  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    const payload = data.payload as { title: string; body: string; url: string } | undefined;
    if (!payload?.title || !payload.body) {
      await docSnap.ref.update({
        status: 'cancelled',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      continue;
    }

    const uid = docSnap.ref.parent.parent?.id;
    if (!uid) continue;

    const type = String(data.type ?? 'scheduled') as WaterReminderType;
    const localDate = String(data.localDate ?? '');

    if (type === 'behind_pace') {
      const shouldSend = await shouldSendBehindPace(uid, localDate);
      if (!shouldSend) {
        await docSnap.ref.update({
          status: 'cancelled',
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        continue;
      }
    }

    const count = await sendPushToUser(uid, {
      title: payload.title,
      body: payload.body,
      link: payload.url || WATER_URL,
      data: {
        type: reminderFcmType(type),
        path: payload.url || WATER_URL,
      },
    });

    await docSnap.ref.update({
      status: 'sent',
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    if (count > 0) sent++;
  }

  return sent;
}

function computeStreak(completedDateKeys: string[], todayKey: string): number {
  const set = new Set(completedDateKeys);
  if (set.size === 0) return 0;

  let streak = 0;
  const cursor = new Date(todayKey + 'T12:00:00Z');

  if (!set.has(todayKey)) {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  while (true) {
    const key = cursor.toISOString().slice(0, 10);
    if (!set.has(key)) break;
    streak++;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  return streak;
}

export async function handleWaterLogGoalAndStreak(
  uid: string,
  before: WaterLogDoc | undefined,
  after: WaterLogDoc | undefined,
  dateKey: string
): Promise<void> {
  if (!after) return;

  const settingsSnap = await settingsDoc(uid).get();
  const settings = settingsSnap.data() as WaterSettings | undefined;
  if (!settings?.notificationsEnabled) return;

  const wasCompleted = before?.completed === true;
  const isCompleted = after.completed === true;
  const totalMl = after.totalMl ?? 0;
  const goalMl = after.goalMl ?? 3000;

  if (!wasCompleted && totalMl >= goalMl) {
    const id = `goal_complete_${dateKey}`;
    const existing = await remindersCol(uid).doc(id).get();
    if (!existing.exists || existing.data()?.status !== 'sent') {
      await sendPushToUser(uid, {
        title: 'Hydration goal reached!',
        body: `You hit ${totalMl} ml today — great work staying hydrated.`,
        link: WATER_URL,
        data: { type: reminderFcmType('goal_complete'), path: WATER_URL },
      });
      await remindersCol(uid).doc(id).set({
        type: 'goal_complete',
        sendAt: admin.firestore.Timestamp.now(),
        status: 'sent',
        localDate: dateKey,
        payload: {
          title: 'Hydration goal reached!',
          body: `You hit ${totalMl} ml today`,
          url: WATER_URL,
        },
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  }

  if (!wasCompleted && isCompleted) {
    const logsSnap = await db().collection('users').doc(uid).collection('waterLogs').get();
    const completedDates = logsSnap.docs
      .filter((d) => (d.data() as WaterLogDoc).completed)
      .map((d) => d.id);

    const streak = computeStreak(completedDates, dateKey);
    const lastMilestone = settings.lastStreakMilestone ?? 0;

    for (const milestone of STREAK_MILESTONES) {
      if (streak >= milestone && lastMilestone < milestone) {
        await sendPushToUser(uid, {
          title: `${milestone}-day hydration streak!`,
          body: `You've hit your water goal ${milestone} days in a row. Keep it up!`,
          link: WATER_URL,
          data: { type: reminderFcmType('streak_milestone'), path: WATER_URL },
        });
        await settingsDoc(uid).set(
          { lastStreakMilestone: milestone, updatedAt: admin.firestore.FieldValue.serverTimestamp() },
          { merge: true }
        );
        break;
      }
    }
  }
}

export async function loadWaterSettingsAndReschedule(uid: string): Promise<void> {
  const settingsSnap = await settingsDoc(uid).get();
  if (!settingsSnap.exists) return;
  await rescheduleWaterReminders(uid, settingsSnap.data() as WaterSettings);
}
