import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  where,
  orderBy,
  limit,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/firebase/db';
import type { WaterIntakeEntry, WaterLogDoc, WaterSettings } from '@/types/water';
import { getDefaultWaterSettings } from '@/lib/water/waterUtils';

const SETTINGS_DOC_ID = 'settings';

function settingsDoc(uid: string) {
  return doc(db(), 'users', uid, 'waterSettings', SETTINGS_DOC_ID);
}

function waterLogDoc(uid: string, dateKey: string) {
  return doc(db(), 'users', uid, 'waterLogs', dateKey);
}

function waterLogsCol(uid: string) {
  return collection(db(), 'users', uid, 'waterLogs');
}

export class WaterFirestoreError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'WaterFirestoreError';
  }
}

export async function getWaterSettings(uid: string): Promise<WaterSettings> {
  try {
    const snap = await getDoc(settingsDoc(uid));
    if (!snap.exists()) return getDefaultWaterSettings();
    const data = snap.data() as Partial<WaterSettings>;
    return { ...getDefaultWaterSettings(data.timezone), ...data };
  } catch (err) {
    throw new WaterFirestoreError('Failed to load water settings', err);
  }
}

export async function saveWaterSettings(
  uid: string,
  partial: Partial<WaterSettings>
): Promise<void> {
  try {
    await setDoc(settingsDoc(uid), { ...partial, updatedAt: serverTimestamp() }, { merge: true });
  } catch (err) {
    throw new WaterFirestoreError('Failed to save water settings', err);
  }
}

export async function ensureWaterSettings(
  uid: string,
  timezone?: string,
  profileNotificationsEnabled = false
): Promise<WaterSettings> {
  try {
    const snap = await getDoc(settingsDoc(uid));
    if (snap.exists()) {
      const data = snap.data() as Partial<WaterSettings>;
      return { ...getDefaultWaterSettings(data.timezone, profileNotificationsEnabled), ...data };
    }
    const defaults = getDefaultWaterSettings(timezone, profileNotificationsEnabled);
    await setDoc(settingsDoc(uid), { ...defaults, updatedAt: serverTimestamp() });
    return defaults;
  } catch (err) {
    throw new WaterFirestoreError('Failed to initialize water settings', err);
  }
}

export async function getWaterLog(uid: string, dateKey: string): Promise<WaterLogDoc | null> {
  try {
    const snap = await getDoc(waterLogDoc(uid, dateKey));
    if (!snap.exists()) return null;
    return snap.data() as WaterLogDoc;
  } catch (err) {
    throw new WaterFirestoreError('Failed to load water log', err);
  }
}

export function subscribeWaterLog(
  uid: string,
  dateKey: string,
  onData: (log: WaterLogDoc | null) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  return onSnapshot(
    waterLogDoc(uid, dateKey),
    (snap) => {
      onData(snap.exists() ? (snap.data() as WaterLogDoc) : null);
    },
    (err) => {
      onError?.(new WaterFirestoreError('Water log subscription failed', err));
    }
  );
}

export async function ensureWaterLog(
  uid: string,
  dateKey: string,
  goalMl: number
): Promise<WaterLogDoc> {
  try {
    const ref = waterLogDoc(uid, dateKey);
    const snap = await getDoc(ref);
    if (snap.exists()) return snap.data() as WaterLogDoc;

    const empty: WaterLogDoc = {
      intakes: [],
      totalMl: 0,
      goalMl,
      completed: false,
    };
    await setDoc(ref, { ...empty, updatedAt: serverTimestamp() });
    return empty;
  } catch (err) {
    throw new WaterFirestoreError('Failed to initialize water log', err);
  }
}

function generateIntakeId(): string {
  return `wi_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export async function addWaterIntake(
  uid: string,
  dateKey: string,
  amount: number,
  note?: string
): Promise<WaterIntakeEntry> {
  try {
    const ref = waterLogDoc(uid, dateKey);
    const entry: WaterIntakeEntry = {
      id: generateIntakeId(),
      time: new Date().toISOString(),
      amount,
      note,
    };

    await runTransaction(db(), async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists()) {
        throw new WaterFirestoreError('Water log not found for today');
      }
      const data = snap.data() as WaterLogDoc;
      const intakes = [...data.intakes, entry];
      const totalMl = intakes.reduce((sum, i) => sum + i.amount, 0);
      const completed = totalMl >= data.goalMl;
      tx.update(ref, {
        intakes,
        totalMl,
        completed,
        updatedAt: serverTimestamp(),
      });
    });

    return entry;
  } catch (err) {
    if (err instanceof WaterFirestoreError) throw err;
    throw new WaterFirestoreError('Failed to add water intake', err);
  }
}

export async function removeWaterIntake(
  uid: string,
  dateKey: string,
  intakeId: string
): Promise<void> {
  try {
    const ref = waterLogDoc(uid, dateKey);

    await runTransaction(db(), async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists()) return;
      const data = snap.data() as WaterLogDoc;
      const intakes = data.intakes.filter((i) => i.id !== intakeId);
      const totalMl = intakes.reduce((sum, i) => sum + i.amount, 0);
      const completed = totalMl >= data.goalMl;
      tx.update(ref, {
        intakes,
        totalMl,
        completed,
        updatedAt: serverTimestamp(),
      });
    });
  } catch (err) {
    throw new WaterFirestoreError('Failed to remove water intake', err);
  }
}

export async function getRecentCompletedWaterLogs(
  uid: string,
  days: number
): Promise<{ dateKey: string; completed: boolean }[]> {
  try {
    const q = query(
      waterLogsCol(uid),
      where('completed', '==', true),
      orderBy('updatedAt', 'desc'),
      limit(days)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ dateKey: d.id, completed: true }));
  } catch (err) {
    throw new WaterFirestoreError('Failed to load recent water logs', err);
  }
}

export async function getRecentWaterLogsForStreak(
  uid: string,
  lookbackDays: number
): Promise<string[]> {
  try {
    const snap = await getDocs(waterLogsCol(uid));
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - lookbackDays);
    const cutoffKey = cutoff.toISOString().slice(0, 10);

    return snap.docs
      .filter((d) => d.id >= cutoffKey && (d.data() as WaterLogDoc).completed)
      .map((d) => d.id);
  } catch (err) {
    throw new WaterFirestoreError('Failed to load streak data', err);
  }
}
