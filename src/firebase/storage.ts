import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getFirebaseStorage } from '@/firebase/config';

export async function uploadFile(
  path: string,
  file: File | Blob
): Promise<string> {
  const storageRef = ref(getFirebaseStorage(), path);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

export async function uploadReceipt(
  tripId: string,
  expenseId: string,
  file: File
): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'jpg';
  return uploadFile(`trips/${tripId}/receipts/${expenseId}.${ext}`, file);
}

export async function uploadRoomReceipt(
  roomId: string,
  expenseId: string,
  file: File
): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'jpg';
  return uploadFile(`rooms/${roomId}/receipts/${expenseId}.${ext}`, file);
}

export async function uploadProfilePhoto(
  uid: string,
  file: File
): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'jpg';
  return uploadFile(`users/${uid}/profile.${ext}`, file);
}

export async function uploadMemoryFile(
  tripId: string,
  memoryId: string,
  file: File
): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'bin';
  return uploadFile(`trips/${tripId}/memories/${memoryId}.${ext}`, file);
}

export async function uploadTripPlanImage(
  tripId: string,
  assetKey: string,
  file: File
): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'jpg';
  const safeKey = assetKey.replace(/[^a-zA-Z0-9/_-]/g, '_');
  return uploadFile(`trips/${tripId}/plan/${safeKey}.${ext}`, file);
}

function sanitizeStorageSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80) || 'item';
}

export async function uploadFitTrackVariationImage(
  uid: string,
  exerciseId: string,
  variation: string,
  file: File | Blob
): Promise<string> {
  const safeExerciseId = sanitizeStorageSegment(exerciseId);
  const safeVariation = sanitizeStorageSegment(variation);
  return uploadFile(`users/${uid}/fittrack/variations/${safeExerciseId}/${safeVariation}.jpg`, file);
}
