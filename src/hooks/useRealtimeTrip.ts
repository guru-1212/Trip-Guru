'use client';

import { useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { getFirebaseDb } from '@/firebase/config';
import { useAppDispatch } from '@/store';
import { setExpenses } from '@/features/expenses/expensesSlice';
import { setMembers } from '@/features/trips/tripsSlice';
import {
  clearTripPackItems,
  setTripPackItems,
} from '@/features/tripPackItems/tripPackItemsSlice';
import { Expense } from '@/types/expense';
import { TripMember } from '@/types/member';
import { TripPackItem } from '@/types/tripPackItem';

export function useRealtimeTrip(tripId: string | null) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (!tripId) return;

    const expensesQuery = query(
      collection(getFirebaseDb(), 'expenses'),
      where('tripId', '==', tripId)
    );

    const membersQuery = query(
      collection(getFirebaseDb(), 'tripMembers'),
      where('tripId', '==', tripId)
    );

    const unsubExpenses = onSnapshot(expensesQuery, (snapshot) => {
      const expenses: Expense[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as Expense[];
      
      // Sort with null safety: treat null createdAt as the latest (now)
      expenses.sort((a, b) => {
        const timeA = a.createdAt?.toMillis() ?? Date.now();
        const timeB = b.createdAt?.toMillis() ?? Date.now();
        return timeB - timeA;
      });
      
      dispatch(setExpenses(expenses));
    });

    const unsubMembers = onSnapshot(membersQuery, (snapshot) => {
      const members: TripMember[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as TripMember[];
      dispatch(setMembers(members));
    });

    const packQuery = query(
      collection(getFirebaseDb(), 'tripPackItems'),
      where('tripId', '==', tripId)
    );

    const unsubPack = onSnapshot(packQuery, (snapshot) => {
      const items: TripPackItem[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as TripPackItem[];
      items.sort((a, b) => {
        if (a.status !== b.status) {
          return a.status === 'packed' ? 1 : -1;
        }
        const timeA = a.createdAt?.toMillis() ?? Date.now();
        const timeB = b.createdAt?.toMillis() ?? Date.now();
        return timeB - timeA;
      });
      dispatch(setTripPackItems(items));
    });

    return () => {
      unsubExpenses();
      unsubMembers();
      unsubPack();
      dispatch(clearTripPackItems());
    };
  }, [tripId, dispatch]);
}
