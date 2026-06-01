import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase/db';
import { TripPlan } from '@/types/tripPlan';
import { createDefaultTripPlan } from '@/lib/tripPlanDefaults';

export async function getTripPlan(tripId: string): Promise<TripPlan | null> {
  const snap = await getDoc(doc(db(), 'tripPlans', tripId));
  if (!snap.exists()) return null;
  return snap.data() as TripPlan;
}

export async function getTripPlanOrDefault(tripId: string): Promise<TripPlan> {
  const existing = await getTripPlan(tripId);
  return existing ?? createDefaultTripPlan(tripId);
}

export async function saveTripPlan(plan: TripPlan): Promise<void> {
  const { tripId, ...rest } = plan;
  await setDoc(
    doc(db(), 'tripPlans', tripId),
    {
      tripId,
      ...rest,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function resetTripPlanToDefault(tripId: string): Promise<TripPlan> {
  const plan = createDefaultTripPlan(tripId);
  await saveTripPlan(plan);
  return plan;
}
