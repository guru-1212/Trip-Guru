import { httpsCallable } from 'firebase/functions';
import { getFirebaseFunctions } from '@/firebase/config';

/**
 * Schedules pending water reminders server-side (requires deployed Cloud Functions).
 */
export async function syncWaterReminderSchedule(): Promise<void> {
  try {
    const fn = httpsCallable(getFirebaseFunctions(), 'rescheduleWaterRemindersCallable');
    await fn();
  } catch (err) {
    console.warn('Water reminder schedule sync failed (deploy functions if missing):', err);
  }
}
