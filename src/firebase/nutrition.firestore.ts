import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  setDoc,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/firebase/db';
import type {
  FoodItem,
  NutrientsPerServing,
  NutritionLogDoc,
  NutritionLogEntry,
  NutritionSettings,
} from '@/types/nutrition';
import { EMPTY_NUTRIENTS } from '@/types/nutrition';
import { isNutritionGoalMet, sumNutrients } from '@/lib/nutrition/nutritionCalculators';
import { DEFAULT_TIMEZONE } from '@/types/water';

const SETTINGS_DOC_ID = 'settings';

function settingsDoc(uid: string) {
  return doc(db(), 'users', uid, 'nutritionSettings', SETTINGS_DOC_ID);
}

function nutritionLogDoc(uid: string, dateKey: string) {
  return doc(db(), 'users', uid, 'nutritionLogs', dateKey);
}

function nutritionLogsCol(uid: string) {
  return collection(db(), 'users', uid, 'nutritionLogs');
}

function customFoodDoc(uid: string, id: string) {
  return doc(db(), 'users', uid, 'customFoods', id);
}

function customFoodsCol(uid: string) {
  return collection(db(), 'users', uid, 'customFoods');
}

function globalFoodDoc(id: string) {
  return doc(db(), 'globalFoods', id);
}

function globalFoodsCol() {
  return collection(db(), 'globalFoods');
}

export class NutritionFirestoreError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'NutritionFirestoreError';
  }
}

export function getDefaultNutritionSettings(timezone = DEFAULT_TIMEZONE): NutritionSettings {
  return {
    gainPace: 'moderate',
    targetWeightKg: 75,
    timezone,
  };
}

export async function ensureNutritionSettings(
  uid: string,
  timezone?: string
): Promise<NutritionSettings> {
  const snap = await getDoc(settingsDoc(uid));
  if (snap.exists()) {
    return { ...getDefaultNutritionSettings(timezone), ...(snap.data() as NutritionSettings) };
  }
  const defaults = getDefaultNutritionSettings(timezone);
  await setDoc(settingsDoc(uid), { ...defaults, updatedAt: serverTimestamp() });
  return defaults;
}

export async function saveNutritionSettings(
  uid: string,
  partial: Partial<NutritionSettings>
): Promise<void> {
  await setDoc(settingsDoc(uid), { ...partial, updatedAt: serverTimestamp() }, { merge: true });
}

export function subscribeNutritionLog(
  uid: string,
  dateKey: string,
  onData: (log: NutritionLogDoc | null) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  return onSnapshot(
    nutritionLogDoc(uid, dateKey),
    (snap) => onData(snap.exists() ? (snap.data() as NutritionLogDoc) : null),
    (err) => onError?.(new NutritionFirestoreError('Nutrition log subscription failed', err))
  );
}

export async function ensureNutritionLog(
  uid: string,
  dateKey: string,
  targets: NutrientsPerServing
): Promise<NutritionLogDoc> {
  const ref = nutritionLogDoc(uid, dateKey);
  const snap = await getDoc(ref);
  if (snap.exists()) return snap.data() as NutritionLogDoc;

  const empty: NutritionLogDoc = {
    entries: [],
    totals: { ...EMPTY_NUTRIENTS },
    targets,
    completed: false,
  };
  await setDoc(ref, { ...empty, updatedAt: serverTimestamp() });
  return empty;
}

function generateEntryId(): string {
  return `nf_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/** Firestore rejects undefined field values */
function sanitizeEntry(entry: NutritionLogEntry): NutritionLogEntry {
  const clean: NutritionLogEntry = {
    id: entry.id,
    name: entry.name,
    mealSlot: entry.mealSlot,
    servings: entry.servings,
    nutrients: sanitizeNutrients(entry.nutrients),
    time: entry.time,
    isCustom: entry.isCustom,
  };
  if (entry.foodId) clean.foodId = entry.foodId;
  return clean;
}

function sanitizeNutrients(n: NutrientsPerServing): NutrientsPerServing {
  const clean: NutrientsPerServing = {
    calories: n.calories ?? 0,
    proteinG: n.proteinG ?? 0,
    carbsG: n.carbsG ?? 0,
    fatG: n.fatG ?? 0,
    fiberG: n.fiberG ?? 0,
    calciumMg: n.calciumMg ?? 0,
    ironMg: n.ironMg ?? 0,
    magnesiumMg: n.magnesiumMg ?? 0,
    potassiumMg: n.potassiumMg ?? 0,
  };
  if (n.sodiumMg != null) clean.sodiumMg = n.sodiumMg;
  return clean;
}

async function persistLog(
  uid: string,
  dateKey: string,
  entries: NutritionLogEntry[],
  targets: NutrientsPerServing
): Promise<NutritionLogDoc> {
  const safeEntries = entries.map(sanitizeEntry);
  const safeTargets = sanitizeNutrients(targets);
  const totals = sumNutrients(safeEntries);
  const doc: NutritionLogDoc = {
    entries: safeEntries,
    totals,
    targets: safeTargets,
    completed: isNutritionGoalMet(totals, safeTargets),
  };
  await setDoc(nutritionLogDoc(uid, dateKey), {
    ...doc,
    updatedAt: serverTimestamp(),
  });
  return doc;
}

export async function addNutritionEntry(
  uid: string,
  dateKey: string,
  entry: Omit<NutritionLogEntry, 'id' | 'time'> & { time?: string },
  targets: NutrientsPerServing
): Promise<NutritionLogEntry> {
  await ensureNutritionLog(uid, dateKey, targets);
  const snap = await getDoc(nutritionLogDoc(uid, dateKey));
  const existing = snap.data() as NutritionLogDoc | undefined;
  const resolvedTargets = existing?.targets ?? targets;

  const full = sanitizeEntry({
    ...entry,
    id: generateEntryId(),
    time: entry.time ?? new Date().toISOString(),
    nutrients: sanitizeNutrients(entry.nutrients),
    ...(entry.foodId ? { foodId: entry.foodId } : {}),
  } as NutritionLogEntry);

  const entries = [...(existing?.entries ?? []), full];
  await persistLog(uid, dateKey, entries, resolvedTargets);
  return full;
}

export async function updateNutritionEntry(
  uid: string,
  dateKey: string,
  entryId: string,
  patch: Partial<Pick<NutritionLogEntry, 'servings' | 'nutrients' | 'name' | 'mealSlot'>>
): Promise<void> {
  const snap = await getDoc(nutritionLogDoc(uid, dateKey));
  if (!snap.exists()) return;
  const data = snap.data() as NutritionLogDoc;
  const entries = data.entries.map((e) =>
    e.id === entryId ? { ...e, ...patch } : e
  );
  await persistLog(uid, dateKey, entries, data.targets);
}

export async function removeNutritionEntry(
  uid: string,
  dateKey: string,
  entryId: string
): Promise<void> {
  const snap = await getDoc(nutritionLogDoc(uid, dateKey));
  if (!snap.exists()) return;
  const data = snap.data() as NutritionLogDoc;
  const entries = data.entries.filter((e) => e.id !== entryId);
  await persistLog(uid, dateKey, entries, data.targets);
}

export async function getRecentNutritionLogs(
  uid: string,
  days: number
): Promise<{ dateKey: string; totals: NutrientsPerServing; targets: NutrientsPerServing }[]> {
  const snap = await getDocs(nutritionLogsCol(uid));
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffKey = cutoff.toISOString().slice(0, 10);

  return snap.docs
    .filter((d) => d.id >= cutoffKey)
    .map((d) => {
      const data = d.data() as NutritionLogDoc;
      return { dateKey: d.id, totals: data.totals, targets: data.targets };
    })
    .sort((a, b) => a.dateKey.localeCompare(b.dateKey));
}

export async function getNutritionStreak(uid: string, lookbackDays = 35): Promise<number> {
  const snap = await getDocs(nutritionLogsCol(uid));
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - lookbackDays);
  const cutoffKey = cutoff.toISOString().slice(0, 10);

  const completedDates = new Set(
    snap.docs
      .filter((d) => d.id >= cutoffKey && (d.data() as NutritionLogDoc).completed)
      .map((d) => d.id)
  );

  let streak = 0;
  const today = new Date();
  for (let i = 0; i < lookbackDays; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    if (completedDates.has(key)) streak++;
    else if (i > 0) break;
  }
  return streak;
}

export async function saveCustomFood(uid: string, food: FoodItem): Promise<void> {
  await setDoc(customFoodDoc(uid, food.id), {
    ...food,
    isCustom: true,
    updatedAt: serverTimestamp(),
  });
}

export async function getCustomFoods(uid: string): Promise<FoodItem[]> {
  const snap = await getDocs(customFoodsCol(uid));
  return snap.docs.map((d) => d.data() as FoodItem);
}

export async function getGlobalFoods(): Promise<FoodItem[]> {
  const snap = await getDocs(globalFoodsCol());
  return snap.docs.map((d) => d.data() as FoodItem);
}

export async function uploadGlobalFoods(items: FoodItem[]): Promise<void> {
  const batchSize = 500;
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = writeBatch(db());
    const chunk = items.slice(i, i + batchSize);
    chunk.forEach((item) => {
      batch.set(globalFoodDoc(item.id), {
        ...item,
        isCustom: false,
        updatedAt: serverTimestamp(),
      });
    });
    await batch.commit();
  }
}

export async function deleteGlobalFood(id: string): Promise<void> {
  await deleteDoc(globalFoodDoc(id));
}

export async function updateGlobalFood(id: string, food: Partial<FoodItem>): Promise<void> {
  await setDoc(globalFoodDoc(id), {
    ...food,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

