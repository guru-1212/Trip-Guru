import * as admin from 'firebase-admin';
import { sendPushToUser } from './notifications';

type DayKey = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';
type SplitId = 'ct' | 'bb' | 'sh' | 'ctbb' | 'legs' | 'core' | 'coresh' | 'rest';
type FitnessGoal = 'Build Muscle' | 'Lose Fat' | 'Strength' | 'Endurance' | 'General';
type ReminderType = 'pre_meal' | 'get_ready' | 'protein';

const SPLIT_NAMES: Record<SplitId, string> = {
  ct: 'Chest + Triceps',
  bb: 'Back + Biceps',
  sh: 'Shoulders',
  ctbb: 'Chest+Tri / Back+Bi',
  legs: 'Legs',
  core: 'Core',
  coresh: 'Core + Shoulders',
  rest: 'Rest',
};

const PRE_MEAL_TEMPLATES: Record<FitnessGoal, string[]> = {
  'Build Muscle': [
    'Oats + banana + whey (~{protein}g protein). Eat light, easy to digest.',
    'Greek yogurt + honey + almonds (~{protein}g protein). Keeps energy steady.',
    '2 eggs + toast + peanut butter (~{protein}g protein). Simple and effective.',
  ],
  'Lose Fat': [
    'Apple + handful of almonds (~{protein}g protein). Light fuel, no crash.',
    'Egg whites + whole-grain toast (~{protein}g protein). Lean pre-workout snack.',
    'Protein shake + berries (~{protein}g protein). Low calorie, quick digest.',
  ],
  Strength: [
    'Rice cakes + peanut butter + banana (~{protein}g protein). Carbs for heavy lifts.',
    'Paneer sandwich on whole grain (~{protein}g protein). Solid pre-session fuel.',
    'Oats + milk + dates (~{protein}g protein). Steady energy for PR attempts.',
  ],
  Endurance: [
    'Banana + dates (~{protein}g protein). Quick carbs for longer sessions.',
    'Smoothie: milk, banana, oats (~{protein}g protein). Hydrating pre-workout.',
    'Toast + jam + boiled egg (~{protein}g protein). Balanced endurance fuel.',
  ],
  General: [
    'Banana + peanut butter (~{protein}g protein). Easy pre-workout snack.',
    'Yogurt + fruit + granola (~{protein}g protein). Balanced and light.',
    'Handful of nuts + an orange (~{protein}g protein). Simple whole-food option.',
  ],
};

const DAY_INDEX: Record<DayKey, number> = {
  Mon: 0,
  Tue: 1,
  Wed: 2,
  Thu: 3,
  Fri: 4,
  Sat: 5,
  Sun: 6,
};

interface FitTrackProfile {
  gymTime?: string | null;
  gymRemindersEnabled?: boolean;
  timezone?: string;
  goal?: FitnessGoal;
  weight?: number;
  weekSchedule?: Record<DayKey, SplitId>;
}

function db() {
  return admin.firestore();
}

function remindersCol(uid: string) {
  return db().collection('users').doc(uid).collection('fittrackReminders');
}

function preWorkoutProteinGrams(weightKg: number): number {
  return Math.round(weightKg * 0.35);
}

function postWorkoutProteinGrams(weightKg: number): number {
  const low = Math.round(weightKg * 0.35);
  const high = Math.round(weightKg * 0.5);
  return Math.max(low, Math.min(high, 40));
}

function getPreWorkoutMealSuggestion(goal: FitnessGoal, weightKg: number, dayKey: DayKey): string {
  const templates = PRE_MEAL_TEMPLATES[goal] ?? PRE_MEAL_TEMPLATES.General;
  const template = templates[DAY_INDEX[dayKey] % templates.length];
  return template.replace('{protein}', String(preWorkoutProteinGrams(weightKg)));
}

function getGetReadyMessage(splitId: SplitId): string {
  const splitName = SPLIT_NAMES[splitId] ?? 'Workout';
  return `Gym in 1 hour — shower, pack your bag, and warm up. Today: ${splitName}.`;
}

function getProteinReminderMessage(weightKg: number): string {
  const grams = postWorkoutProteinGrams(weightKg);
  return `Anabolic window closing — aim for ~${grams}g protein in the next 10 minutes.`;
}

function reminderUrl(type: ReminderType): string {
  return type === 'get_ready' ? '/fittrack/workout' : '/fittrack/checklist';
}

function reminderFcmType(type: ReminderType): string {
  return `gym.reminder.${type}`;
}

export function getLocalDateString(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function getDayKeyInTimezone(date: Date, timeZone: string): DayKey {
  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
  }).format(date);
  const map: Record<string, DayKey> = {
    Mon: 'Mon',
    Tue: 'Tue',
    Wed: 'Wed',
    Thu: 'Thu',
    Fri: 'Fri',
    Sat: 'Sat',
    Sun: 'Sun',
  };
  return map[weekday] ?? 'Mon';
}

export function localDateTimeInZoneToUtc(
  dateStr: string,
  timeStr: string,
  timeZone: string
): Date {
  const [year, month, day] = dateStr.split('-').map((x) => parseInt(x, 10));
  const [hour, minute] = timeStr.split(':').map((x) => parseInt(x, 10));

  let utcMs = Date.UTC(year, month - 1, day, hour, minute, 0);

  for (let attempt = 0; attempt < 4; attempt++) {
    const d = new Date(utcMs);
    const fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const parts = Object.fromEntries(
      fmt
        .formatToParts(d)
        .filter((p) => p.type !== 'literal')
        .map((p) => [p.type, p.value])
    );
    const zY = parseInt(parts.year, 10);
    const zM = parseInt(parts.month, 10);
    const zD = parseInt(parts.day, 10);
    const zH = parseInt(parts.hour === '24' ? '0' : parts.hour, 10);
    const zMin = parseInt(parts.minute, 10);

    if (zY === year && zM === month && zD === day && zH === hour && zMin === minute) {
      return d;
    }

    const desired = Date.UTC(year, month - 1, day, hour, minute, 0);
    const actual = Date.UTC(zY, zM - 1, zD, zH, zMin, 0);
    utcMs += desired - actual;
  }

  return new Date(utcMs);
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function subtractMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() - minutes * 60 * 1000);
}

function buildPreMealPayload(profile: FitTrackProfile, dayKey: DayKey) {
  const goal = profile.goal ?? 'General';
  const weight = profile.weight ?? 75;
  const body = getPreWorkoutMealSuggestion(goal, weight, dayKey);
  return {
    title: 'Pre-workout meal',
    body: `Pre-workout fuel: ${body}`,
    url: reminderUrl('pre_meal'),
  };
}

function buildGetReadyPayload(splitId: SplitId) {
  return {
    title: 'Get ready for gym',
    body: getGetReadyMessage(splitId),
    url: reminderUrl('get_ready'),
  };
}

function buildProteinPayload(weightKg: number) {
  return {
    title: 'Protein reminder',
    body: getProteinReminderMessage(weightKg),
    url: reminderUrl('protein'),
  };
}

async function cancelPendingPreGymReminders(uid: string): Promise<void> {
  const snap = await remindersCol(uid)
    .where('status', '==', 'pending')
    .where('type', 'in', ['pre_meal', 'get_ready'])
    .get();

  if (snap.empty) return;

  const batch = db().batch();
  snap.docs.forEach((docSnap) => {
    batch.update(docSnap.ref, {
      status: 'cancelled',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });
  await batch.commit();
}

async function cancelPendingProteinReminders(uid: string): Promise<void> {
  const snap = await remindersCol(uid)
    .where('status', '==', 'pending')
    .where('type', '==', 'protein')
    .get();

  if (snap.empty) return;

  const batch = db().batch();
  snap.docs.forEach((docSnap) => {
    batch.update(docSnap.ref, {
      status: 'cancelled',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });
  await batch.commit();
}

export async function reschedulePreGymReminders(uid: string, profile: FitTrackProfile): Promise<void> {
  await cancelPendingPreGymReminders(uid);

  if (!profile.gymRemindersEnabled || !profile.gymTime) return;

  const timeZone = profile.timezone || 'UTC';
  const weekSchedule = profile.weekSchedule;
  if (!weekSchedule) return;

  const now = new Date();
  const batch = db().batch();
  let writes = 0;

  for (let offset = 0; offset < 7; offset++) {
    const day = new Date(now.getTime() + offset * 24 * 60 * 60 * 1000);
    const localDate = getLocalDateString(day, timeZone);
    const dayKey = getDayKeyInTimezone(day, timeZone);
    const splitId = weekSchedule[dayKey];
    if (!splitId || splitId === 'rest') continue;

    const gymAt = localDateTimeInZoneToUtc(localDate, profile.gymTime, timeZone);
    const preMealAt = subtractMinutes(gymAt, 120);
    const getReadyAt = subtractMinutes(gymAt, 60);

    const slots: Array<{ type: 'pre_meal' | 'get_ready'; sendAt: Date }> = [
      { type: 'pre_meal', sendAt: preMealAt },
      { type: 'get_ready', sendAt: getReadyAt },
    ];

    for (const slot of slots) {
      if (slot.sendAt.getTime() <= now.getTime()) continue;

      const payload =
        slot.type === 'pre_meal'
          ? buildPreMealPayload(profile, dayKey)
          : buildGetReadyPayload(splitId);

      const id = `${slot.type}_${localDate}`;
      batch.set(
        remindersCol(uid).doc(id),
        {
          type: slot.type,
          sendAt: admin.firestore.Timestamp.fromDate(slot.sendAt),
          status: 'pending',
          localDate,
          payload,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      writes++;
    }
  }

  if (writes > 0) await batch.commit();
}

export async function scheduleProteinReminderForUser(
  uid: string,
  profile: FitTrackProfile
): Promise<void> {
  await cancelPendingProteinReminders(uid);

  const timeZone = profile.timezone || 'UTC';
  const now = new Date();
  const localDate = getLocalDateString(now, timeZone);
  const sendAt = addMinutes(now, 20);
  const weight = profile.weight ?? 75;
  const payload = buildProteinPayload(weight);
  const id = `protein_${localDate}_${now.getTime()}`;

  await remindersCol(uid).doc(id).set({
    type: 'protein',
    sendAt: admin.firestore.Timestamp.fromDate(sendAt),
    status: 'pending',
    localDate,
    payload,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

export async function dispatchDueFitTrackReminders(): Promise<number> {
  const now = admin.firestore.Timestamp.now();
  const snap = await db()
    .collectionGroup('fittrackReminders')
    .where('status', '==', 'pending')
    .where('sendAt', '<=', now)
    .limit(200)
    .get();

  let sent = 0;

  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    const payload = data.payload as { title: string; body: string; url: string } | undefined;
    if (!payload?.title || !payload.body || !payload.url) {
      await docSnap.ref.update({
        status: 'cancelled',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      continue;
    }

    const uid = docSnap.ref.parent.parent?.id;
    if (!uid) continue;

    const type = String(data.type ?? 'pre_meal') as ReminderType;
    const count = await sendPushToUser(uid, {
      title: payload.title,
      body: payload.body,
      link: payload.url,
      data: {
        type: reminderFcmType(type),
        path: payload.url,
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
