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
