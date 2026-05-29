import { Timestamp } from 'firebase/firestore';

export interface User {
  uid: string;
  name: string;
  email: string;
  phone: string;
  photoURL: string;
  fcmToken: string;
  createdAt: Timestamp;
  notifyEnabled?: boolean;
}
