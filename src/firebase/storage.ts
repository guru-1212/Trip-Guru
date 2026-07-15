import {
  ref,
  uploadBytes,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import { getFirebaseStorage } from '@/firebase/config';

export async function uploadFile(
  path: string,
  file: File | Blob
): Promise<string> {
  const storageRef = ref(getFirebaseStorage(), path);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

/**
 * Upload with progress reporting (0..1). Uses a resumable upload so the caller
 * can drive a progress bar.
 */
export function uploadFileWithProgress(
  path: string,
  file: File | Blob,
  onProgress?: (fraction: number) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    const task = uploadBytesResumable(ref(getFirebaseStorage(), path), file);
    task.on(
      'state_changed',
      (snap) => {
        if (snap.totalBytes > 0) onProgress?.(snap.bytesTransferred / snap.totalBytes);
      },
      reject,
      () => {
        getDownloadURL(task.snapshot.ref).then(resolve).catch(reject);
      }
    );
  });
}

/** Delete a file at a full storage path. Resolves even if it was already gone. */
export async function deleteFileAtPath(path: string): Promise<void> {
  try {
    await deleteObject(ref(getFirebaseStorage(), path));
  } catch (err) {
    if ((err as { code?: string }).code === 'storage/object-not-found') return;
    throw err;
  }
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

/**
 * Upload a progress photo/video, preserving the original file (and thus its
 * format — gif animation, svg, webp, video all stay intact). Returns both the
 * download URL and the storage path (needed to delete the file later).
 */
export async function uploadFitTrackProgressPhoto(
  uid: string,
  photoId: string,
  ext: string,
  file: File | Blob,
  onProgress?: (fraction: number) => void
): Promise<{ url: string; path: string }> {
  const safeId = sanitizeStorageSegment(photoId);
  const safeExt = sanitizeStorageSegment(ext) || 'bin';
  const path = `users/${uid}/fittrack/progress/${safeId}.${safeExt}`;
  const url = await uploadFileWithProgress(path, file, onProgress);
  return { url, path };
}

export async function uploadYogaPosturePhoto(
  uid: string,
  poseId: string,
  file: File
): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'jpg';
  const timestamp = Date.now();
  const safePoseId = sanitizeStorageSegment(poseId);
  return uploadFile(`users/${uid}/yoga/postures/${safePoseId}_${timestamp}.${ext}`, file);
}
