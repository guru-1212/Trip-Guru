import { createAsyncThunk } from '@reduxjs/toolkit';
import { onAuthStateChanged } from 'firebase/auth';
import { getFirebaseAuth } from '@/firebase/config';
import { getUser } from '@/firebase/firestore';
import { setUser, clearAuth } from './authSlice';
import type { AppDispatch } from '@/store';

export const initAuthListener = createAsyncThunk(
  'auth/initListener',
  async (_, { dispatch }) => {
    return new Promise<void>((resolve) => {
      onAuthStateChanged(getFirebaseAuth(), async (firebaseUser) => {
        if (firebaseUser) {
          const profile = await getUser(firebaseUser.uid);
          dispatch(
            setUser({
              uid: firebaseUser.uid,
              profile: profile
                ? profile
                : {
                    uid: firebaseUser.uid,
                    name: firebaseUser.displayName ?? 'User',
                    email: firebaseUser.email ?? '',
                    phone: '',
                    photoURL: firebaseUser.photoURL ?? '',
                    fcmToken: '',
                    createdAt: { toDate: () => new Date() } as never,
                  },
            })
          );
        } else {
          dispatch(clearAuth());
        }
        resolve();
      });
    });
  }
);

export function listenAuth(dispatch: AppDispatch): () => void {
  return onAuthStateChanged(getFirebaseAuth(), async (firebaseUser) => {
    if (firebaseUser) {
      const profile = await getUser(firebaseUser.uid);
      dispatch(
        setUser({
          uid: firebaseUser.uid,
          profile: profile ?? null,
        })
      );
    } else {
      dispatch(clearAuth());
    }
  });
}
